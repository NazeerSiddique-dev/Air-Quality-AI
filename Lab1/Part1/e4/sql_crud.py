import sqlite3

conn = sqlite3.connect("students.db")
cursor = conn.cursor()

print("Initial Records:")
for row in cursor.execute("SELECT * FROM students"):
    print(row)

# INSERT
cursor.execute("INSERT INTO students(name,age,city) VALUES('David',26,'Chennai')")
print("\nRecord Inserted")

# READ
print("\nAfter Insert:")
for row in cursor.execute("SELECT * FROM students"):
    print(row)

# UPDATE
cursor.execute("UPDATE students SET age=24 WHERE name='Alice'")
print("\nRecord Updated (Alice age changed)")

# DELETE
cursor.execute("DELETE FROM students WHERE name='Bob'")
print("\nRecord Deleted (Bob removed)")

conn.commit()

print("\nFinal Records:")
for row in cursor.execute("SELECT * FROM students"):
    print(row)

conn.close()