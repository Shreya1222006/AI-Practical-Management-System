#!/usr/bin/env python3
"""
SQL Runner for DBMS Practicals
Executes SQL queries against an isolated PostgreSQL instance and outputs
structured results (columns, rows, execution time, row count) in JSON format.
"""

import sys
import os
import time
import json
import psycopg2
from psycopg2 import sql

DB_HOST = os.environ.get("PGHOST", "/tmp")
DB_PORT = int(os.environ.get("PGPORT", 5432))
DB_USER = os.environ.get("PGUSER", "postgres")
DB_NAME = os.environ.get("PGDATABASE", "vpl_db")

def run_sql(query_file, schema_file=None):
    result = {
        "success": False,
        "results": [],
        "stdout": "",
        "stderr": "",
        "execution_time_ms": 0
    }
    
    start_time = time.time()
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            dbname=DB_NAME,
            connect_timeout=5
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Execute seed/schema file if present
        if schema_file and os.path.exists(schema_file):
            with open(schema_file, 'r', encoding='utf-8') as sf:
                schema_sql = sf.read()
                if schema_sql.strip():
                    cursor.execute(schema_sql)
                    result["stdout"] += f"Loaded schema: {schema_file}\n"
        
        # Execute target query file
        with open(query_file, 'r', encoding='utf-8') as qf:
            query_content = qf.read()
            
        if not query_content.strip():
            result["stderr"] = "Query file is empty"
            return result

        # Split multiple statements if any, or execute
        statements = [s.strip() for s in query_content.split(';') if s.strip()]
        for stmt in statements:
            cursor.execute(stmt)
            if cursor.description:
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                # Convert complex types to strings for JSON serialization
                serialized_rows = []
                for row in rows:
                    serialized_rows.append([str(v) if v is not None else None for v in row])
                
                stmt_res = {
                    "statement": stmt,
                    "columns": columns,
                    "rows": serialized_rows,
                    "row_count": len(serialized_rows)
                }
                result["results"].append(stmt_res)
                
                # Format text grid for readable stdout
                col_widths = [len(c) for c in columns]
                for r in serialized_rows:
                    for i, val in enumerate(r):
                        col_widths[i] = max(col_widths[i], len(str(val)))
                
                header = " | ".join(col.ljust(col_widths[i]) for i, col in enumerate(columns))
                sep = "-+-".join("-" * col_widths[i] for i in range(len(columns)))
                grid_lines = [header, sep]
                for r in serialized_rows:
                    grid_lines.append(" | ".join(str(val or 'NULL').ljust(col_widths[i]) for i, val in enumerate(r)))
                
                result["stdout"] += f"\nQuery: {stmt}\n" + "\n".join(grid_lines) + f"\n({len(serialized_rows)} rows)\n"
            else:
                row_count = cursor.rowcount if cursor.rowcount >= 0 else 0
                result["stdout"] += f"\nQuery: {stmt}\nQuery executed successfully. Affected rows: {row_count}\n"
                result["results"].append({
                    "statement": stmt,
                    "affected_rows": row_count
                })

        cursor.close()
        conn.close()
        result["success"] = True

    except Exception as e:
        result["stderr"] = str(e)
        result["success"] = False
    finally:
        result["execution_time_ms"] = round((time.time() - start_time) * 1000, 2)

    return result

if __name__ == "__main__":
    q_file = sys.argv[1] if len(sys.argv) > 1 else "query.sql"
    s_file = sys.argv[2] if len(sys.argv) > 2 else ("schema.sql" if os.path.exists("schema.sql") else None)
    
    res = run_sql(q_file, s_file)
    # Output readable stdout first
    if res["stdout"]:
        print(res["stdout"])
    if res["stderr"]:
        print(res["stderr"], file=sys.stderr)
        
    # Write JSON results to execution_result.json for programmatic access
    with open("/workspace/execution_result.json", "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
        
    if not res["success"]:
        sys.exit(1)
