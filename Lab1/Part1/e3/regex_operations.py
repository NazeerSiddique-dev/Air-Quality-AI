import re

# read file
with open("input.txt", "r") as f:
    text = f.read()

print("Original Text:\n")
print(text)

# 1. find all emails
emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+", text)
print("\nEmails Found:")
print(emails)

# 2. find phone numbers
phones = re.findall(r"\d{10}", text)
print("\nPhone Numbers Found:")
print(phones)

# 3. replace gmail domain
replaced_text = re.sub(r"gmail.com", "university.edu", text)
print("\nText After Replacement:")
print(replaced_text)

# 4. extract names
names = re.findall(r"Name:\s(\w+)", text)
print("\nNames Extracted:")
print(names)


