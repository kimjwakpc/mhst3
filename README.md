# 즈3 몬스터 도감

몬스터헌터 스토리즈3 동료몬 수치를 폰에서 보기 위한 정적 웹사이트.

- 사이트: https://kimjwakpc.github.io/mhst3/
- 데이터: [즈3 몬스터 수치 (구글시트)](https://docs.google.com/spreadsheets/d/1_OgFiA32kDbcPGc1JAtOQfj1T5HDRnwIdxXWd4oCqGU/edit?gid=1768099903)

## 기능
- **도감**: 이름·S기술·패시브·부화기술 검색, 속성/타입/랭크/이동/부화그룹 필터, 수치별 정렬
- **상세**: 개체 등급, 실제 수치(기본+빙고 보너스), 빙고, 이동 능력, S기술, 부화기술, 드랍 패시브
- **비교**: 최대 4마리 나란히 비교 (가장 높은 값 강조)
- **참고표**: 등급→수치 환산표, 빙고 보너스표
- 폰에서 "홈 화면에 추가"하면 앱처럼 사용 가능, 라이트/다크 모드 자동

## 데이터 흐름
1. 페이지를 열면 구글시트 CSV를 **실시간**으로 읽음 (`export?format=csv`, 실패 시 `gviz`)
2. 성공하면 브라우저에 캐시 → 다음엔 캐시로 먼저 띄우고 다시 시트 확인
3. 시트를 못 읽으면 저장본 `data/sheet_snapshot.csv` 사용

상단 오른쪽 배지가 현재 데이터 출처(시트 실시간 / 캐시 / 저장본)이며, 누르면 다시 불러옴.

## 파일
| 파일 | 역할 |
|---|---|
| `index.html` / `style.css` / `app.js` | 사이트 본체 (빌드 없음) |
| `data/sheet_snapshot.csv` | 시트 저장본 (헤더 행 + 몬스터 행) |
| `tools/update_snapshot.py` | 시트 → 저장본 갱신 |
| `tools/check_data.py` | 저장본 검산 (총합·빙고·환산표 일치) |

## 로컬 실행
```
python3 -m http.server 8000   # → http://localhost:8000
```
