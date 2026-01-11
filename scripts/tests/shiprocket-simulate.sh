#!/bin/bash

# Shiprocket Integration Test Script
# Simulates various fulfillment and webhook scenarios

BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_SESSION_TOKEN:-}" # Set this if needed

echo "=== Shiprocket Integration Tests ==="
echo ""

# Test 1: Create AWB for paid order
echo "Test 1: Create AWB for paid order"
echo "POST $BASE_URL/api/fulfillment/on-payment"
curl -X POST "$BASE_URL/api/fulfillment/on-payment" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "YOUR_ORDER_ID_HERE"}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 2: Retry fulfillment
echo "Test 2: Retry fulfillment"
echo "POST $BASE_URL/api/fulfillment/retry"
curl -X POST "$BASE_URL/api/fulfillment/retry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"order_id": "YOUR_ORDER_ID_HERE"}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 3: Simulate webhook - AWB Generated
echo "Test 3: Simulate webhook - AWB Generated"
echo "POST $BASE_URL/api/shipping/webhook"
curl -X POST "$BASE_URL/api/shipping/webhook" \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-signature: test-signature" \
  -d '{
    "shipment_id": 123456,
    "awb_code": "AWB123456789",
    "status": "AWB_GENERATED",
    "current_status": "NEW",
    "courier_name": "Blue Dart",
    "tracking_url": "https://shiprocket.co/tracking/AWB123456789"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 4: Simulate webhook - In Transit
echo "Test 4: Simulate webhook - In Transit"
curl -X POST "$BASE_URL/api/shipping/webhook" \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-signature: test-signature" \
  -d '{
    "shipment_id": 123456,
    "awb_code": "AWB123456789",
    "status": "IN_TRANSIT",
    "current_status": "IN_TRANSIT",
    "courier_name": "Blue Dart"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 5: Simulate webhook - Delivered
echo "Test 5: Simulate webhook - Delivered"
curl -X POST "$BASE_URL/api/shipping/webhook" \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-signature: test-signature" \
  -d '{
    "shipment_id": 123456,
    "awb_code": "AWB123456789",
    "status": "DELIVERED",
    "current_status": "DELIVERED",
    "courier_name": "Blue Dart"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 6: Duplicate webhook (idempotency test)
echo "Test 6: Duplicate webhook (idempotency)"
curl -X POST "$BASE_URL/api/shipping/webhook" \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-signature: test-signature" \
  -d '{
    "shipment_id": 123456,
    "awb_code": "AWB123456789",
    "status": "DELIVERED",
    "current_status": "DELIVERED",
    "timestamp": "2025-01-01T00:00:00Z"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

# Test 7: Invalid webhook signature
echo "Test 7: Invalid webhook signature"
curl -X POST "$BASE_URL/api/shipping/webhook" \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-signature: invalid-signature" \
  -d '{"shipment_id": 123456}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Response received"
echo ""

echo "=== Tests Complete ==="
echo ""
echo "Note: Replace YOUR_ORDER_ID_HERE with actual order IDs from your database"
echo "Set ADMIN_SESSION_TOKEN if admin authentication is required"























