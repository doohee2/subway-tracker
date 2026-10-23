#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preprocess_subway.py
지하철 시간표 엑셀(.xlsx) 및 CSV 원본 데이터를 표준 구조의 JSON으로 변환하는 전처리 프로그램
이름값(columns)과 실제값(data)을 분리하여 JSON 적재 효율 및 파일 용량을 극대화합니다.
"""

import os
import sys
import re
import json
import argparse
import datetime
from typing import Dict, List, Tuple, Any, Optional
import pandas as pd

# 1. 코레일 약칭 역명 정규화 사전
KORAIL_STATION_MAP = {
    "신인천": "인천", "신길온": "신길온천", "평촌동": "평촌",
    "과천청": "정부과천청사", "경마공": "경마공원", "총신대": "총신대입구(이수)",
    "총신대입구": "총신대입구(이수)",
    "4이촌": "이촌", "숙대입": "숙대입구", "4서울": "서울역", "서울": "서울역",
    "4충무": "충무로", "4동운": "동대문역사문화공원", "4동대": "동대문",
    "한성대": "한성대입구", "성신여": "성신여대입구", "미아4": "미아사거리",
    "4창동": "창동", "남동인": "남동인더스파크", "인천논": "인천논현",
    "소래포": "소래포구", "신수원": "수원", "수원시": "수원시청",
    "매탄권": "매탄권선", "대모산": "대모산입구", "구룡역": "구룡",
    "강남구": "강남구청", "로데오": "압구정로데오", "1양정": "양정",
    "1양원": "양원", "효창공": "효창공원앞", "홍대입": "홍대입구",
    "디엠시": "디지털미디어시티", "항공대": "한국항공대",
    # 개정 및 별칭 역명
    "별가람": "별내별가람",
    "당고개": "불암산"
}

# 시간표 데이터 컬럼 정의 (시각, 분, 종착역, 급행여부, 열차번호)
TIMETABLE_COLUMNS = ["hour", "minute", "destStation", "isExpress", "trainNo"]


def normalize_station_name(name: Any) -> str:
    """역명을 정규화하여 표준 역명 반환 ('역' 접미사 처리 및 코레일 약칭 변환)"""
    if name is None or pd.isna(name):
        return ""
    clean_name = str(name).strip()
    if not clean_name or clean_name == "nan":
        return ""

    # 1. 코레일 약칭 매핑
    if clean_name in KORAIL_STATION_MAP:
        return KORAIL_STATION_MAP[clean_name]

    # 2. '서울역'을 제외한 '역' 접미사 정리
    if clean_name != "서울역" and clean_name.endswith("역") and len(clean_name) > 1:
        base_name = clean_name[:-1]
        if base_name in KORAIL_STATION_MAP:
            return KORAIL_STATION_MAP[base_name]
        return base_name

    return clean_name


def parse_time(val: Any) -> Optional[Tuple[int, str]]:
    """시간 객체 또는 문자열(HH:MM:SS)을 파싱하여 (hour, minute_str) 반환.
    심야 시간대(00시 -> 24시, 01시 -> 25시) 정규화 적용."""
    if val is None or pd.isna(val):
        return None

    h: Optional[int] = None
    m: Optional[int] = None

    if isinstance(val, (datetime.time, datetime.datetime)):
        h = val.hour
        m = val.minute
    else:
        s = str(val).strip()
        if not s or s == "nan":
            return None
        parts = s.split(":")
        if len(parts) >= 2:
            try:
                h = int(parts[0])
                m = int(parts[1])
            except ValueError:
                return None
        else:
            return None

    if h is None or m is None:
        return None

    # 심야 막차 정규화: 00시대 -> 24, 01시대 -> 25, 02시대 -> 26, 03시대 -> 27
    if 0 <= h < 4:
        h += 24

    return h, f"{m:02d}"


def infer_excel_line_name(file_path: str, sheet_name: str, df: pd.DataFrame) -> str:
    """엑셀 시트명 및 내용 기반 호선명 추정"""
    sheet_str = sheet_name.lower()
    file_str = os.path.basename(file_path).lower()
    col0_strs = [str(x).strip() for x in df[0].dropna()]
    all_text = " ".join(col0_strs)

    if "경의중앙" in sheet_str or "경의중앙" in file_str or any(st in all_text for st in ["문산", "지평", "용문", "덕소"]):
        return "경의중앙선"
    if "4호선" in sheet_str or "4호선" in file_str or any(st in all_text for st in ["진접", "오남", "별가람", "당고개", "산본"]):
        return "4호선"
    if "수인분당" in sheet_str or "수인분당" in file_str or any(st in all_text for st in ["신인천", "죽전", "수원시", "고색", "수서"]):
        return "수인분당선"

    return "수인분당선"


def process_excel_matrix(
    file_path: str,
    all_station_data: Optional[Dict] = None,
    seen_keys: Optional[Dict] = None,
    format_type: str = "table"
) -> List[Dict]:
    """코레일 엑셀 파일(2차원 매트릭스 구조)을 표준 리스트 구조로 변환"""
    if all_station_data is None:
        all_station_data = {}
    if seen_keys is None:
        seen_keys = {}

    xls = pd.ExcelFile(file_path)

    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        if df.empty or df.shape[1] < 2:
            continue

        line = infer_excel_line_name(file_path, sheet_name, df)

        # 요일 매핑 (코레일의 '휴일'은 토요일과 휴일 양쪽 모두 복제 적용)
        day_types = ["평일"]
        if "휴일" in sheet_name or "공휴일" in sheet_name:
            day_types = ["토요일", "휴일"]
        elif "토" in sheet_name:
            day_types = ["토요일"]

        # 방향 판별
        direction = "상행" if ("상" in sheet_name or "내선" in sheet_name) else "하행"

        # 동적 행 인덱스 찾기
        train_row_idx, orig_row_idx, dest_row_idx = -1, -1, -1
        for i, val in enumerate(df[0]):
            v_str = str(val).strip()
            if v_str == "열차번호":
                train_row_idx = i
            elif v_str == "시발역":
                orig_row_idx = i
            elif v_str == "종착역":
                dest_row_idx = i

        if train_row_idx == -1:
            continue

        # 열차(컬럼)별 순회
        for col in range(1, df.shape[1]):
            raw_tno = df.iloc[train_row_idx, col]
            if pd.isna(raw_tno):
                continue
            tno = str(raw_tno).strip()
            if not tno or tno == "nan":
                continue

            orig_station = normalize_station_name(df.iloc[orig_row_idx, col]) if orig_row_idx != -1 else ""
            dest_station = normalize_station_name(df.iloc[dest_row_idx, col]) if dest_row_idx != -1 else ""

            # 급행 판별 (열차번호 패턴)
            is_express = any(prefix in tno for prefix in ["K44", "K63", "K57", "K58", "S43"])

            # 역별 행 순회 (2행씩: 도착 행 -> 출발 행)
            r = train_row_idx + 1
            while r < len(df):
                raw_st = df.iloc[r, 0]
                if pd.isna(raw_st) or str(raw_st).strip() in ["", "개정안", "연계열번", "시흥기"]:
                    r += 1
                    continue

                st_name = normalize_station_name(raw_st)
                arr_val = df.iloc[r, col]
                dep_val = df.iloc[r + 1, col] if (r + 1 < len(df)) else None

                has_arr = pd.notna(arr_val) and str(arr_val).strip() not in ["", "nan"]
                has_dep = pd.notna(dep_val) and str(dep_val).strip() not in ["", "nan"]

                if not has_arr and not has_dep:
                    r += 2
                    continue

                # 무정차 통과 필터링 (시발역이 아닌데 도착이 없고 출발만 있는 경우)
                is_orig = (st_name == orig_station)
                if not is_orig and not has_arr and has_dep:
                    r += 2
                    continue

                target_val = dep_val if has_dep else arr_val
                parsed_time = parse_time(target_val)
                if parsed_time is not None:
                    h, m = parsed_time
                    # 중복 제거용 열차 번호 숫자 추출
                    tno_digits = re.sub(r"[^0-9]", "", tno) or tno
                    dedup_key = (h, m, tno_digits)

                    for dt in day_types:
                        key = (line, st_name, dt, direction)
                        if key not in all_station_data:
                            all_station_data[key] = []
                            seen_keys[key] = set()

                        if dedup_key not in seen_keys[key]:
                            seen_keys[key].add(dedup_key)
                            all_station_data[key].append({
                                "hour": h,
                                "minute": m,
                                "destStation": dest_station,
                                "isExpress": is_express,
                                "trainNo": tno
                            })
                r += 2

    return _format_result(all_station_data, format_type=format_type)


def process_csv_table(
    file_path: str,
    all_station_data: Optional[Dict] = None,
    seen_keys: Optional[Dict] = None,
    format_type: str = "table"
) -> List[Dict]:
    """서울교통공사 등 테이블형 CSV 파일을 표준 리스트 구조로 변환"""
    if all_station_data is None:
        all_station_data = {}
    if seen_keys is None:
        seen_keys = {}

    df = None
    for enc in ["cp949", "utf-8", "utf-8-sig", "euc-kr"]:
        try:
            df = pd.read_csv(file_path, encoding=enc, low_memory=False)
            break
        except (UnicodeDecodeError, Exception):
            continue

    if df is None:
        raise ValueError(f"CSV 파일을 열 수 없습니다 (인코딩 확인 필요): {file_path}")

    # 컬럼명 동적 매핑
    col_map = {}
    for col in df.columns:
        c_clean = str(col).strip()
        if c_clean in ["호선", "노선", "노선명", "LINE_NUM"]:
            col_map["line"] = col
        elif c_clean in ["역사명", "역명", "STATION_NM", "STATN_NM"]:
            col_map["station"] = col
        elif c_clean in ["주중주말", "요일", "DAY_TYPE"]:
            col_map["day"] = col
        elif c_clean in ["방향", "상하행", "상하구분", "UPDN_LINE"]:
            col_map["direction"] = col
        elif c_clean in ["열차출발시간", "출발시간", "출발시각", "DEP_TIME"]:
            col_map["dep_time"] = col
        elif c_clean in ["열차도착시간", "도착시간", "도착시각", "ARR_TIME"]:
            col_map["arr_time"] = col
        elif c_clean in ["도착역", "종착역", "행선지", "DEST_STN"]:
            col_map["dest"] = col
        elif c_clean in ["출발역", "시발역", "ORIG_STN"]:
            col_map["orig"] = col
        elif c_clean in ["급행여부", "급행", "IS_EXPRESS"]:
            col_map["express"] = col
        elif c_clean in ["열차코드", "열차번호", "TRAIN_NO"]:
            col_map["train_no"] = col

    # 필수 컬럼 체크
    required = ["line", "station", "day", "direction"]
    if not all(k in col_map for k in required):
        raise ValueError(f"CSV에 필수 컬럼이 누락되었습니다: {df.columns.tolist()}")

    # itertuples를 활용한 고속 순회
    for row in df.itertuples(index=False):
        row_dict = row._asdict()

        # 1. 호선 정규화 (예: 1 -> 1호선)
        raw_line = str(row_dict[col_map["line"]]).strip()
        if raw_line.isdigit():
            line = f"{int(raw_line)}호선"
        elif not raw_line.endswith("선"):
            line = f"{raw_line}호선"
        else:
            line = raw_line

        # 2. 역명 정규화
        st_name = normalize_station_name(row_dict[col_map["station"]])
        dest_station = normalize_station_name(row_dict.get(col_map.get("dest", ""), ""))

        # 3. 요일 매핑
        raw_day = str(row_dict[col_map["day"]]).strip().upper()
        if raw_day in ["DAY", "평일", "주중"]:
            day_types = ["평일"]
        elif raw_day in ["SAT", "토요일", "토"]:
            day_types = ["토요일"]
        elif raw_day in ["END", "HOL", "휴일", "공휴일", "일요일", "주말"]:
            day_types = ["휴일"]
        else:
            day_types = ["평일"]

        # 4. 방향 매핑
        raw_dir = str(row_dict[col_map["direction"]]).strip().upper()
        if raw_dir in ["UP", "상행", "상"]:
            direction = "상행"
        elif raw_dir in ["DOWN", "하행", "하"]:
            direction = "하행"
        elif raw_dir in ["IN", "내선"]:
            direction = "내선"
        elif raw_dir in ["OUT", "외선"]:
            direction = "외선"
        else:
            direction = "상행" if "상" in raw_dir else "하행"

        # 5. 시간 파싱 (출발시간 우선, 미존재 시 도착시간)
        dep_val = row_dict.get(col_map.get("dep_time", ""), None)
        arr_val = row_dict.get(col_map.get("arr_time", ""), None)

        has_arr = pd.notna(arr_val) and str(arr_val).strip() not in ["", "nan"]
        has_dep = pd.notna(dep_val) and str(dep_val).strip() not in ["", "nan"]

        if not has_arr and not has_dep:
            continue

        target_val = dep_val if has_dep else arr_val
        parsed_time = parse_time(target_val)
        if parsed_time is None:
            continue

        h, m = parsed_time

        # 6. 급행 여부
        raw_exp = row_dict.get(col_map.get("express", ""), 0)
        is_express = str(raw_exp).strip() in ["1", "Y", "True", "true", "급행"]

        # 7. 열차 번호
        raw_tno = row_dict.get(col_map.get("train_no", ""), "")
        tno = str(raw_tno).strip() if pd.notna(raw_tno) and str(raw_tno).strip() != "nan" else ""

        tno_digits = re.sub(r"[^0-9]", "", tno) or tno
        dedup_key = (h, m, tno_digits)

        for dt in day_types:
            key = (line, st_name, dt, direction)
            if key not in all_station_data:
                all_station_data[key] = []
                seen_keys[key] = set()

            if dedup_key not in seen_keys[key]:
                seen_keys[key].add(dedup_key)
                all_station_data[key].append({
                    "hour": h,
                    "minute": m,
                    "destStation": dest_station,
                    "isExpress": is_express,
                    "trainNo": tno
                })

    return _format_result(all_station_data, format_type=format_type)


def _format_result(all_station_data: Dict, format_type: str = "table") -> List[Dict]:
    """
    그룹화된 시간표 딕셔너리를 표준 구조로 변환 및 정렬
    - format_type="table": timetables를 { "columns": [...], "data": [[...], ...] } 형태로 변환 (용량 대폭 최적화)
    - format_type="flat": columns와 data를 최상위 레벨에 직접 배치
    - format_type="object": 기존의 [{ "hour": 5, ... }, ...] 객체 리스트 형태 유지
    """
    result = []
    for (line, st_name, dt, dir_val), timetables in all_station_data.items():
        # 시간순 정렬 (hour 오름차순, minute 오름차순, trainNo 오름차순)
        timetables.sort(key=lambda x: (x["hour"], int(x["minute"]), x["trainNo"]))

        if format_type == "table":
            data_rows = [
                [t["hour"], t["minute"], t["destStation"], t["isExpress"], t["trainNo"]]
                for t in timetables
            ]
            result.append({
                "line": line,
                "stationName": st_name,
                "dayType": dt,
                "direction": dir_val,
                "timetables": {
                    "columns": TIMETABLE_COLUMNS,
                    "data": data_rows
                }
            })
        elif format_type == "flat":
            data_rows = [
                [t["hour"], t["minute"], t["destStation"], t["isExpress"], t["trainNo"]]
                for t in timetables
            ]
            result.append({
                "line": line,
                "stationName": st_name,
                "dayType": dt,
                "direction": dir_val,
                "columns": TIMETABLE_COLUMNS,
                "data": data_rows
            })
        else:
            result.append({
                "line": line,
                "stationName": st_name,
                "dayType": dt,
                "direction": dir_val,
                "timetables": timetables
            })

    # 노선, 역명, 요일, 방향 기준 정렬
    result.sort(key=lambda x: (x["line"], x["stationName"], x["dayType"], x["direction"]))
    return result


def process_paths(paths: List[str], format_type: str = "table") -> List[Dict]:
    """파일 목록 및 디렉토리를 순회하여 통합 처리"""
    all_station_data: Dict = {}
    seen_keys: Dict = {}

    file_list = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                for f in sorted(files):
                    if f.endswith(".xlsx") or f.endswith(".csv"):
                        file_list.append(os.path.join(root, f))
        elif os.path.isfile(p):
            file_list.append(p)
        else:
            print(f"[경고] 경로를 찾을 수 없습니다: {p}", file=sys.stderr)

    if not file_list:
        print("[에러] 처리할 엑셀(.xlsx) 또는 CSV 파일이 없습니다.", file=sys.stderr)
        return []

    print(f"[*] 총 {len(file_list)}개 시간표 파일 전처리 시작 (포맷: {format_type}):")
    for idx, fpath in enumerate(file_list, 1):
        fname = os.path.basename(fpath)
        print(f"  [{idx}/{len(file_list)}] 파싱 중: {fname}")
        if fpath.endswith(".xlsx"):
            process_excel_matrix(fpath, all_station_data=all_station_data, seen_keys=seen_keys, format_type=format_type)
        elif fpath.endswith(".csv"):
            process_csv_table(fpath, all_station_data=all_station_data, seen_keys=seen_keys, format_type=format_type)

    result = _format_result(all_station_data, format_type=format_type)
    
    total_timetables = 0
    for item in result:
        if format_type == "table":
            total_timetables += len(item["timetables"]["data"])
        elif format_type == "flat":
            total_timetables += len(item["data"])
        else:
            total_timetables += len(item["timetables"])

    print(f"[+] 전처리 완료: 총 {len(result)}개 역/방향/요일 그룹, {total_timetables:,}건 열차 도착 정보 생성.")
    return result


def save_json(results: List[Dict], output_path: str, compact: bool = False, format_type: str = "table") -> None:
    """결과 데이터를 JSON 파일로 저장 (가독성 높은 2차원 표 스타일 또는 완전 압축 지원)"""
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    if compact:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, separators=(",", ":"))
    else:
        # table/flat 포맷일 경우 각 행(data row)을 한 줄에 컴팩트하게 배치하여 가독성과 용량 모두 잡음
        if format_type in ["table", "flat"]:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write("[\n")
                for i, g in enumerate(results):
                    f.write("  {\n")
                    f.write('    "line": ' + json.dumps(g["line"], ensure_ascii=False) + ',\n')
                    f.write('    "stationName": ' + json.dumps(g["stationName"], ensure_ascii=False) + ',\n')
                    f.write('    "dayType": ' + json.dumps(g["dayType"], ensure_ascii=False) + ',\n')
                    f.write('    "direction": ' + json.dumps(g["direction"], ensure_ascii=False) + ',\n')
                    
                    if format_type == "table":
                        tt = g["timetables"]
                        f.write('    "timetables": {\n')
                        f.write('      "columns": ' + json.dumps(tt["columns"], ensure_ascii=False) + ',\n')
                        f.write('      "data": [\n')
                        data_rows = tt["data"]
                        for j, row in enumerate(data_rows):
                            row_str = json.dumps(row, ensure_ascii=False)
                            comma = "," if j < len(data_rows) - 1 else ""
                            f.write("        " + row_str + comma + "\n")
                        f.write("      ]\n")
                        f.write("    }\n")
                    else:  # flat
                        f.write('    "columns": ' + json.dumps(g["columns"], ensure_ascii=False) + ',\n')
                        f.write('    "data": [\n')
                        data_rows = g["data"]
                        for j, row in enumerate(data_rows):
                            row_str = json.dumps(row, ensure_ascii=False)
                            comma = "," if j < len(data_rows) - 1 else ""
                            f.write("        " + row_str + comma + "\n")
                        f.write("    ]\n")

                    comma_g = "," if i < len(results) - 1 else ""
                    f.write(f"  }}{comma_g}\n")
                f.write("]\n")
        else:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[성공] 표준 JSON 저장 완료: '{output_path}' ({file_size_mb:.2f} MB)")


def get_default_input_path() -> str:
    """기본 입력 디렉토리 경로 탐색 (현재 디렉토리 또는 상위 디렉토리 기준)"""
    if os.path.exists("timetable"):
        return "timetable"
    elif os.path.exists(os.path.join("..", "timetable")):
        return os.path.join("..", "timetable")
    return "timetable"


def get_default_output_path() -> str:
    """기본 출력 JSON 파일 경로 탐색 (json 디렉토리 자동 감지)"""
    if os.path.exists("json"):
        return os.path.join("json", "subway_standard_timetables.json")
    elif os.path.exists(os.path.join("..", "json")):
        return os.path.join("..", "json", "subway_standard_timetables.json")
    return "subway_standard_timetables.json"


def main():
    default_input = get_default_input_path()
    default_output = get_default_output_path()

    parser = argparse.ArgumentParser(
        description="지하철 시간표 원본 데이터(엑셀/CSV)를 표준 JSON으로 변환하는 전처리 프로그램"
    )
    parser.add_argument(
        "inputs",
        nargs="*",
        default=[default_input],
        help=f"입력 엑셀(.xlsx), CSV 파일 또는 디렉토리 경로 (기본값: '{default_input}')"
    )
    parser.add_argument(
        "-o", "--output",
        default=default_output,
        help=f"출력 JSON 파일 경로 (기본값: '{default_output}')"
    )
    parser.add_argument(
        "--format",
        choices=["table", "flat", "object"],
        default="table",
        help="출력 데이터 구조 포맷 (기본값: table - columns와 data 분리 구조)"
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="JSON을 공백/줄바꿈 없이 한 줄로 압축 저장 (IndexedDB/배포 용량 극대화)"
    )

    args = parser.parse_args()

    results = process_paths(args.inputs, format_type=args.format)
    if not results:
        print("[종료] 생성된 데이터가 없습니다.")
        return

    save_json(results, args.output, compact=args.compact, format_type=args.format)


if __name__ == "__main__":
    main()
