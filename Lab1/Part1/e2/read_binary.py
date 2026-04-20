# Read data from a binary file

numbers = []

with open("numbers.bin", "rb") as f:
    while True:
        bytes_data = f.read(4)
        if not bytes_data:
            break
        number = int.from_bytes(bytes_data, byteorder="little")
        numbers.append(number)

print("Numbers read from binary file:")
print(numbers)
