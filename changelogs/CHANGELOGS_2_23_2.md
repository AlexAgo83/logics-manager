# Logics Manager 2.23.2

A patch release for product consistency checks and viewer preference adoption.

## Product references are all checked

Product consistency now validates every comma-separated related request, backlog,
and task reference, including lists that mix plain and backticked identifiers.
A valid first reference no longer hides a missing or wrong-kind later reference.
Annotations after backticked identifiers, such as `(refreshed)`, remain supported.

## Preference adoption reads only a known record

The viewer matches the requested preference-store name against the records it
publishes and reads the selected record. An unknown name is rejected without
resolving or opening the client-supplied path. Adoption still merges favourites
and fleet roots without modifying the source record.

## Maintenance

Vitest and its V8 coverage integration are updated to 4.1.11.
