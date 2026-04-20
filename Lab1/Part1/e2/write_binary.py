# Write data to a binary file

data = [10, 20, 30, 40, 50,60,70,80]

with open("numbers.bin", "wb") as f:
    for num in data:
        f.write(num.to_bytes(4, byteorder="little"))

print("Binary file written successfully.")
