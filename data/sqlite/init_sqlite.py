"""
Script khởi tạo CSDL SQLite cục bộ từ default_treatments.sql
Phục vụ Checkpoint 3 (Tuần 4.2 trong Kế hoạch đồ án tốt nghiệp)
"""

import sqlite3
import os

DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQL_FILE = os.path.join(DB_DIR, "default_treatments.sql")
DB_FILE = os.path.join(DB_DIR, "disease_treatments.db")

def init_database():
    print(f"Khởi tạo CSDL SQLite tại: {DB_FILE}")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql_script = f.read()

    cursor.executescript(sql_script)
    conn.commit()

    # Kiểm tra số lượng bản ghi đã chèn
    cursor.execute("SELECT COUNT(*) FROM DiseaseTreatments")
    count = cursor.fetchone()[0]
    print(f" Đã khởi tạo bảng DiseaseTreatments thành công với {count} phác đồ mẫu!")

    # Truy vấn thử nghiệm một bản ghi
    cursor.execute("SELECT crop_name, disease_name, vietnamese_name FROM DiseaseTreatments LIMIT 1")
    row = cursor.fetchone()
    print(f" Test query: Cây [{row[0]}] - Bệnh [{row[1]}] -> {row[2]}")

    conn.close()

if __name__ == "__main__":
    init_database()

