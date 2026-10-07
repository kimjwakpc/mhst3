# 즈3 몬스터 도감

몬스터헌터 스토리즈3 동료몬 수치를 폰에서 보기 위한 정적 웹사이트.

- 사이트: https://kimjwakpc.github.io/mhst3/
- 원본 자료: [즈3 몬스터 수치 (구글시트)](https://docs.google.com/spreadsheets/d/1_OgFiA32kDbcPGc1JAtOQfj1T5HDRnwIdxXWd4oCqGU/edit?gid=1768099903)

## 기능
- **도감**: 이름·S기술·패시브·부화기술 검색, 속성/타입/랭크/이동/부화그룹 필터, 수치별 정렬
- **상세**: 개체 등급, 실제 수치(기본+빙고 보너스), 빙고, 이동 능력, S기술, 부화기술, 드랍 패시브
- **비교**: 최대 4마리 나란히 비교 (가장 높은 값 강조)
- **참고표**: 등급→수치 환산표, 빙고 보너스표
- 폰에서 "홈 화면에 추가"하면 앱처럼 사용 가능, 라이트/다크 모드 자동

## 데이터
원본 구글시트(더 이상 갱신되지 않음)에서 한 번 가져온 자료를 `data/monsters.csv`로 사이트에 포함했다.
사이트는 이 파일만 읽으며 구글시트와는 연동하지 않는다. 수치를 고칠 땐 이 CSV를 직접 수정하고 `python3 tools/check_data.py`로 검산한다.

## 파일
| 파일 | 역할 |
|---|---|
| `index.html` / `style.css` / `app.js` | 사이트 본체 (빌드 없음) |
| `data/monsters.csv` | 몬스터 자료 (헤더 행 + 몬스터 행) |
| `tools/check_data.py` | 자료 검산 (총합·빙고·환산표 일치) |

## 로컬 실행
```
python3 -m http.server 8000   # → http://localhost:8000
```
