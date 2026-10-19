"""
gen_xlsx_direct.py
Generates semis_comps.xlsx by running the builder script via subprocess.
This file is the entry point that executes build_semis_comps.py.
"""
import subprocess, sys, os

script = "/Users/robertopisu/src/financebot/scripts/build_semis_comps.py"
result = subprocess.run([sys.executable, script], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr)
    sys.exit(result.returncode)
