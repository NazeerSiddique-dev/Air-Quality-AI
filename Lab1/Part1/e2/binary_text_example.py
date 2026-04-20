# Example: write and read text in binary format

text = "Data Engineering Lab"

# write binary
with open("text.bin", "wb") as f:
    f.write(text.encode())

print("Text written in binary format.")

# read binary
with open("text.bin", "rb") as f:
    data = f.read()

print("Read from binary file:")
print(data.decode())
