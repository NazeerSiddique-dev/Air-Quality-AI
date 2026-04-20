# Exercise 6: NumPy Operations

import numpy as np

# 1. Create a NumPy array
arr1 = np.array([1, 2, 3, 4, 5])
print("1D Array:")
print(arr1)

# 2. Create a 2D array
arr2 = np.array([[1,2,3],[4,5,6]])
print("\n2D Array:")
print(arr2)

# 3. Reshape array
arr3 = np.arange(6)
reshaped = arr3.reshape(2,3)
print("\nReshaped Array (2x3):")
print(reshaped)

# 4. Arithmetic operations
print("\nArithmetic Operations:")
print("Add 5:", arr1 + 5)
print("Multiply by 2:", arr1 * 2)

# 5. Aggregation operations
arr4 = np.array([10,20,30,40])

print("\nAggregation Operations:")
print("Sum:", arr4.sum())
print("Mean:", arr4.mean())
print("Max:", arr4.max())
print("Min:", arr4.min())