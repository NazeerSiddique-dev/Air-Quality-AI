# Exercise 5: MongoDB operations using PyMongo

from pymongo import MongoClient

# connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")

# create database
db = client["lab_database"]

# create collection
collection = db["students"]

# insert documents
collection.insert_one({"name":"Alice","age":23,"city":"Delhi"})
collection.insert_one({"name":"Bob","age":25,"city":"Mumbai"})
collection.insert_one({"name":"dev","age":20,"city":"Kanpur"})

print("Documents inserted.")

# read documents
print("\nAll Students:")
for doc in collection.find():
    print(doc)

# update document
collection.update_one(
    {"name":"Alice"},
    {"$set":{"age":24}}
)

print("\nDocument Updated (Alice age changed).")

# delete document
collection.delete_one({"name":"Bob"})

print("\nDocument Deleted (Bob removed).")

# show final documents
print("\nFinal Records:")
for doc in collection.find():
    print(doc)