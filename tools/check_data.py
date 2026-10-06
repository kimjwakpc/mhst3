"""시트 스냅샷(data/sheet_snapshot.csv) 무결성 검사.

- 총합 = 체력+공격력+방어력+회심+스피드+스테회복+초기스테 (등급 합)
- 각 '총합 X' = 기본 + 보너스
- 빙고 보너스가 빙고 표(2/3/5빙고)와 일치하는지
- 기본 수치가 등급 환산표와 일치하는지

사용:  python3 tools/check_data.py [csv경로]
"""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "sheet_snapshot.csv"

# 빙고 보너스 표 (시트 상단)
BINGO = {
    "초기 스테": [5, 10, 15],
    "스테 회복": [2, 3, 4],
    "회심률": [3, 5, 7],
    "스피드": [1, 2, 3],
    "파룡력": [5, 10, 15],
}
# 등급 → 실제 수치
STAM_INIT = {4: 30, 7: 50, 10: 70}
STAM_REC = {10: 12, 7: 8, 4: 4}
CRIT = {1: 0, 6: 10, 8: 15, 10: 20}
SPEED = {3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 14, 10: 15}

rows = list(csv.reader(path.open(encoding="utf-8")))
hi = next(i for i, r in enumerate(rows) if len(r) > 2 and r[2] == "몬스터 이름")
data = [r for r in rows[hi + 1:] if len(r) > 40 and r[2] and r[2] != "새 몬스터"]

def n(v):
    try:
        return int(v)
    except ValueError:
        return None

errs = []
for r in data:
    name = r[2]
    g = [n(r[i]) for i in (8, 9, 10, 12, 13, 14, 15)]
    if None not in g and sum(g) != n(r[6]):
        errs.append(f"{name}: 총합 {r[6]} != 등급합 {sum(g)}")
    for base, bonus, tot, label in ((21, 22, 23, "스테"), (25, 26, 27, "회복"), (29, 30, 31, "회심"),
                                    (33, 34, 35, "스피드"), (37, 38, 39, "파룡력")):
        if n(r[base]) + n(r[bonus]) != n(r[tot]):
            errs.append(f"{name}: 총합 {label} 불일치")
    # 빙고 보너스
    expect = {"초기 스테": 0, "스테 회복": 0, "회심률": 0, "스피드": 0, "파룡력": 0}
    for k, slot in zip((17, 18, 19), range(3)):
        if r[k] in expect:
            expect[r[k]] = BINGO[r[k]][slot]
    got = {"초기 스테": n(r[22]), "스테 회복": n(r[26]), "회심률": n(r[30]), "스피드": n(r[34]), "파룡력": n(r[38])}
    if expect != got:
        errs.append(f"{name}: 빙고 보너스 {got} (예상 {expect})")
    if STAM_INIT.get(n(r[15])) != n(r[21]):
        errs.append(f"{name}: 초기스테 등급 {r[15]} → {r[21]}")
    if STAM_REC.get(n(r[14])) != n(r[25]):
        errs.append(f"{name}: 스테회복 등급 {r[14]} → {r[25]}")
    if CRIT.get(n(r[12])) != n(r[29]):
        errs.append(f"{name}: 회심 등급 {r[12]} → {r[29]}")
    if SPEED.get(n(r[13])) != n(r[33]):
        errs.append(f"{name}: 스피드 등급 {r[13]} → {r[33]}")

print(f"몬스터 {len(data)}종 검사")
print("\n".join(errs) if errs else "이상 없음")
