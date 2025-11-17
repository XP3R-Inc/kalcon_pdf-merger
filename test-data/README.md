# Test Data Structure

This directory demonstrates the expected folder structure for the Invoice Merger application.

## Structure

```
test-data/
  Acme Corp/
    Invoices/
      FY25/
        04-25/
          Invoice/
            Acme_Invoice_April_2025.pdf
          Expense Backup/
            receipt1.pdf
            receipt2.jpg
            travel/
              hotel_receipt.pdf
              flight_booking.pdf
  
  Beta LLC/
    Invoices/
      FY25/
        04-25/
          Invoice/
            Beta_Invoice.pdf
          Expense Backup/
            expense1.pdf
            expense2.png
```

## Creating Test Data

1. Create the folder structure above
2. Add sample PDF files (can be any PDF)
3. Add sample images (PNG, JPG, JPEG)
4. Run the application and point it to the `test-data` directory

## Testing with CLI

```bash
# Scan test data
npm run cli -- scan --base ./test-data

# Merge for Acme Corp
npm run cli -- merge --base ./test-data --client "Acme Corp" --fy 25 --month 04-25
```

