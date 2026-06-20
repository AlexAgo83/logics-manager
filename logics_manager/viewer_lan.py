"""LAN pairing concern for the Logics viewer server.

Extracted from ``viewer.py`` to isolate the device-pairing runtime. These
classes are re-exported from ``logics_manager.viewer`` for backward
compatibility, so existing imports such as ``from logics_manager.viewer
import LanPairingBroker`` keep working unchanged.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

_PAIRING_PIN_TTL_SECONDS = 120
_PAIRING_MAX_ATTEMPTS = 5


def _hash_device_token(token: str) -> str:
    return "sha256:" + hashlib.sha256(token.encode("utf-8")).hexdigest()


def _iso_now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


@dataclass
class _PairedDevice:
    id: str
    label: str
    token_hash: str
    created_at: str
    last_seen_at: str

    def to_payload(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "createdAt": self.created_at,
            "lastSeenAt": self.last_seen_at,
        }


class LanDeviceRegistry:
    """JSON-backed store of paired device tokens.

    Tokens are persisted only as SHA-256 hashes; the cleartext is shown to
    the device exactly once at pair-completion time. Every match uses
    hmac.compare_digest on the hash to keep comparisons constant-time.
    """

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()
        self._devices: dict[str, _PairedDevice] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return
        for entry in raw.get("devices", []) or []:
            try:
                device = _PairedDevice(
                    id=str(entry["id"]),
                    label=str(entry.get("label") or ""),
                    token_hash=str(entry["tokenHash"]),
                    created_at=str(entry.get("createdAt") or _iso_now()),
                    last_seen_at=str(entry.get("lastSeenAt") or ""),
                )
            except KeyError:
                continue
            self._devices[device.id] = device

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"devices": [
            {
                "id": d.id,
                "label": d.label,
                "tokenHash": d.token_hash,
                "createdAt": d.created_at,
                "lastSeenAt": d.last_seen_at,
            }
            for d in self._devices.values()
        ]}
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        try:
            os.chmod(tmp, 0o600)
        except OSError:
            pass
        tmp.replace(self.path)

    def register(self, label: str, token: str) -> _PairedDevice:
        device_id = secrets.token_urlsafe(8)
        now = _iso_now()
        device = _PairedDevice(
            id=device_id,
            label=label or "device",
            token_hash=_hash_device_token(token),
            created_at=now,
            last_seen_at=now,
        )
        with self._lock:
            self._devices[device.id] = device
            self._save()
        return device

    def revoke(self, device_id: str) -> bool:
        with self._lock:
            removed = self._devices.pop(device_id, None) is not None
            if removed:
                self._save()
        return removed

    def list_payload(self) -> list[dict[str, Any]]:
        with self._lock:
            return [d.to_payload() for d in self._devices.values()]

    def find_matching(self, token: str) -> _PairedDevice | None:
        if not token:
            return None
        candidate_hash = _hash_device_token(token)
        match: _PairedDevice | None = None
        with self._lock:
            for device in self._devices.values():
                if hmac.compare_digest(candidate_hash, device.token_hash):
                    match = device
        if match is None:
            return None
        with self._lock:
            stored = self._devices.get(match.id)
            if stored is not None:
                stored.last_seen_at = _iso_now()
                try:
                    self._save()
                except OSError:
                    pass
        return match


@dataclass
class _PendingPairing:
    pairing_id: str
    pin: str
    label: str
    requester_ip: str
    created_at: float
    attempts: int = 0


class LanPairingBroker:
    """In-memory broker for active PIN pairings.

    A pairing is created when a device requests write access; the host CLI
    prints the PIN. The device must echo the PIN back within the TTL. PINs
    are single-use and rate-limited per pairing.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._pending: dict[str, _PendingPairing] = {}

    @staticmethod
    def _generate_pin() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    def start(self, *, label: str, requester_ip: str) -> _PendingPairing:
        pairing_id = secrets.token_urlsafe(12)
        entry = _PendingPairing(
            pairing_id=pairing_id,
            pin=self._generate_pin(),
            label=label or "device",
            requester_ip=requester_ip,
            created_at=time.monotonic(),
        )
        with self._lock:
            self._purge_expired_locked()
            self._pending[pairing_id] = entry
        return entry

    def _purge_expired_locked(self) -> None:
        now = time.monotonic()
        expired = [pid for pid, entry in self._pending.items() if now - entry.created_at > _PAIRING_PIN_TTL_SECONDS]
        for pid in expired:
            self._pending.pop(pid, None)

    def try_complete(self, *, pairing_id: str, pin: str) -> tuple[str, _PendingPairing] | None:
        """Return ('ok', entry) on match. None means hard refusal (expired,
        unknown, or too many attempts). Wrong PIN increments attempts but
        leaves the entry alive until the cap or TTL is hit."""
        with self._lock:
            self._purge_expired_locked()
            entry = self._pending.get(pairing_id)
            if entry is None:
                return None
            entry.attempts += 1
            if entry.attempts > _PAIRING_MAX_ATTEMPTS:
                self._pending.pop(pairing_id, None)
                return None
            if hmac.compare_digest(entry.pin, pin or ""):
                self._pending.pop(pairing_id, None)
                return ("ok", entry)
            return ("wrong", entry)
