#!/usr/bin/env python3
"""
SQLite Table Lister and Content Viewer
Connects to a SQLite database and prints all tables with their contents
"""
import sqlite3
import sys
import os


def list_and_show_tables(db_path):
    """
    Connect to SQLite database and print all tables with their contents
    
    Args:
        db_path: Path to the SQLite database file
    """
    # Check if file exists
    if not os.path.exists(db_path):
        print(f"Error: Database file '{db_path}' not found")
        sys.exit(1)
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Query to get all tables
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name;
        """)
        
        tables = cursor.fetchall()
        
        # Print results
        if tables:
            print(f"\nDatabase: '{db_path}'")
            print("=" * 80)
            print(f"Total tables: {len(tables)}\n")
            
            for idx, table in enumerate(tables, 1):
                table_name = table[0]
                print(f"\n{idx}. TABLE: {table_name}")
                print("-" * 80)
                
                # Get column names
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                
                # Get all rows from the table
                cursor.execute(f"SELECT * FROM {table_name}")
                rows = cursor.fetchall()
                
                if rows:
                    # Print column headers
                    header = " | ".join(column_names)
                    print(header)
                    print("-" * len(header))
                    
                    # Print rows
                    for row in rows:
                        row_str = " | ".join(str(val) if val is not None else "NULL" for val in row)
                        print(row_str)
                    
                    print(f"\nTotal rows: {len(rows)}")
                else:
                    print("(Empty table - no rows)")
                
                print("-" * 80)
            
            print("\n" + "=" * 80)
        else:
            print(f"\nNo tables found in database '{db_path}'\n")
        
        # Close connection
        conn.close()
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


def main():
    """Main function with hardcoded database path"""
    # Hardcoded database path
    db_path = r"E:\Coding\swapnil_project\workflow_orchestrator\sagepilot\backend\workflows.db"
    
    list_and_show_tables(db_path)


if __name__ == "__main__":
    main()