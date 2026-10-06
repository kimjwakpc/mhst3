"""구글시트를 받아 data/sheet_snapshot.csv(저장본)를 갱신한다.

사이트는 열 때마다 시트를 실시간으로 읽으므로, 이 저장본은
시트를 못 읽을 때 쓰는 비상용이다. 시트를 크게 고친 뒤 한 번씩 돌리면 된다.

사용:  python3 tools/update_snapshot.py
       (docs.google.com 접속이 막힌 환경이면 실패한다 — 우회하지 말고 막혔다고 알릴 것)
"""
import csv
import io
import subprocess
import sys
import urllib.request
from pathlib import Path

SHEET_ID = "1_OgFiA32kDbcPGc1JAtOQfj1T5HDRnwIdxXWd4oCqGU"
GID = "1768099903"
URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "sheet_snapshot.csv"

try:
    with urllib.request.urlopen(URL, timeout=30) as r:
        text = r.read().decode("utf-8-sig")
except Exception as e:  # noqa: BLE001
    sys.exit(f"시트 받기 실패 (docs.google.com 접속 확인): {e}")

rows = list(csv.reader(io.StringIO(text)))
hi = next((i for i, r in enumerate(rows) if len(r) > 2 and r[2].strip() == "몬스터 이름"), None)
if hi is None:
    sys.exit("헤더 행(몬스터 이름)을 찾지 못함 — 시트 구성이 바뀌었는지 확인")

keep = [rows[hi]] + [r for r in rows[hi + 1:] if len(r) > 2 and r[2].strip() and r[2].strip() != "새 몬스터"]
buf = io.StringIO()
csv.writer(buf, lineterminator="\n").writerows(keep)
old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
OUT.write_text(buf.getvalue(), encoding="utf-8")
print(f"저장본 갱신: 몬스터 {len(keep) - 1}종" + (" (변경 없음)" if old == buf.getvalue() else ""))
subprocess.run([sys.executable, str(ROOT / "tools" / "check_data.py")], check=False)
