#!/bin/bash

# Address API Test Script
# Tests CRUD operations for address book

BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}" # Set this after logging in

echo "=== Address API Tests ==="
echo ""

# Test 1: List addresses
echo "Test 1: List addresses"
echo "GET $BASE_URL/api/addresses/list"
curl -X GET "$BASE_URL/api/addresses/list" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 2: Create address (valid)
echo "Test 2: Create address (valid)"
echo "POST $BASE_URL/api/addresses/create"
curl -X POST "$BASE_URL/api/addresses/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "label": "Home",
    "recipient_name": "John Doe",
    "phone": "9876543210",
    "address_line_1": "123 Main Street",
    "address_line_2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India",
    "save_as_default": true
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 3: Create address (non-serviceable pincode)
echo "Test 3: Create address (non-serviceable pincode)"
curl -X POST "$BASE_URL/api/addresses/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "recipient_name": "Jane Doe",
    "phone": "9876543211",
    "address_line_1": "456 Test Street",
    "city": "Test City",
    "state": "Test State",
    "pincode": "000000",
    "country": "India"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 4: Update address
echo "Test 4: Update address"
echo "POST $BASE_URL/api/addresses/update"
echo "Replace ADDRESS_ID with actual address ID from Test 2"
curl -X POST "$BASE_URL/api/addresses/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "address_id": "ADDRESS_ID",
    "recipient_name": "John Doe Updated",
    "phone": "9876543210",
    "address_line_1": "123 Main Street Updated",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 5: Set default address
echo "Test 5: Set default address"
echo "POST $BASE_URL/api/addresses/set-default"
echo "Replace ADDRESS_ID with actual address ID"
curl -X POST "$BASE_URL/api/addresses/set-default" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "addressId": "ADDRESS_ID"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 6: Delete address
echo "Test 6: Delete address"
echo "POST $BASE_URL/api/addresses/delete"
echo "Replace ADDRESS_ID with actual address ID"
curl -X POST "$BASE_URL/api/addresses/delete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "address_id": "ADDRESS_ID"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 7: Invalid phone number
echo "Test 7: Create address (invalid phone)"
curl -X POST "$BASE_URL/api/addresses/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "recipient_name": "Test User",
    "phone": "123",
    "address_line_1": "Test Address",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 8: Invalid pincode
echo "Test 8: Create address (invalid pincode)"
curl -X POST "$BASE_URL/api/addresses/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "recipient_name": "Test User",
    "phone": "9876543210",
    "address_line_1": "Test Address",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "123",
    "country": "India"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

echo "=== Tests Complete ==="
echo ""
echo "Note: Replace ADDRESS_ID with actual address IDs from previous responses"
echo "Set AUTH_TOKEN after logging in to the application"























