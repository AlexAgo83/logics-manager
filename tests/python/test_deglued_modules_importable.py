from __future__ import annotations

import importlib
import inspect

import pytest

# req_273: these modules used to be assembled by exec(compile(concat parts)), which
# left their functions' source unrecoverable and their tracebacks pointing at the
# wrong lines. As plain importable modules, inspect.getsource must resolve to the
# real file. If exec-glue ever comes back, getsource breaks and this test fails.
DEGLUED_MODULES = [
    "logics_manager.mcp",
    "logics_manager.sync",
    "logics_manager.audit",
    "logics_manager.release",
    "logics_manager.assist_support",
    "logics_manager.viewer",
    "logics_manager.flow",
]


@pytest.mark.parametrize("module_name", DEGLUED_MODULES)
def test_module_functions_have_recoverable_source(module_name):
    module = importlib.import_module(module_name)
    own_functions = [
        obj
        for obj in vars(module).values()
        if inspect.isfunction(obj) and obj.__module__ == module_name
    ]
    assert own_functions, f"{module_name} defines no functions of its own"
    sample = own_functions[0]
    source_file = inspect.getsourcefile(sample)
    assert source_file and source_file.endswith(".py")
    # Would raise OSError under the old exec-from-string glue.
    assert inspect.getsource(sample).strip()


def test_no_exec_compile_glue_remains():
    import logics_manager

    package_dir = inspect.getsourcefile(logics_manager)
    assert package_dir
    from pathlib import Path

    root = Path(package_dir).parent
    offenders = [p.name for p in root.rglob("*.py") if "exec(compile(" in p.read_text(encoding="utf-8")]
    assert offenders == [], f"exec(compile) glue still present in: {offenders}"
