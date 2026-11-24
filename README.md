# EBSL Automat – Water Meter Physical Verification Calculator

This ZIP contains the readable source project and a standalone HTML build.

## Project structure

- `index.html` – page structure and layout.
- `css/styles.css` – Aqua theme, responsive layout and component styling.
- `js/app.js` – calculations, validation, test history and export functions.
- `assets/ebsl-logo.png` – EBSL logo supplied for this project.
- `standalone.html` – single-file build with CSS, JavaScript and logo embedded.

## Run on a computer

1. Extract the ZIP to a folder.
2. Keep the folder structure unchanged.
3. Open `index.html` in a modern browser such as Chrome or Edge.
4. To use the standalone one-file version instead, open `standalone.html`.

## Run on a phone

For the modular project, serve the extracted folder through a local web server or host it on an internal/public web server. Opening only `index.html` from an in-app file preview may block JavaScript or prevent sibling CSS/JS files from loading.

For Android, one option is to upload the folder contents to a static web host and open the resulting HTTPS URL in Chrome. For iPhone, use Safari with a hosted HTTPS URL. The `standalone.html` file can also be tried directly in the browser, but some file previewers restrict JavaScript and downloads.

## Calculations included

- Meter volume = new cumulative reading − previous cumulative reading.
- Volume error (%) = (meter volume − physically collected volume) / physically collected volume × 100.
- Actual average flow (L/min) = collected volume / test duration in minutes.
- Flow-rate error (%) = (average Modbus flow − actual average flow) / actual average flow × 100.

The test interval can be entered in seconds, minutes or hours. Pipe diameter is recorded with the test; it is not used as a multiplier in the accuracy formulas.

## Export options

The application contains export actions for Excel-compatible `.xls`, Word-compatible `.doc`, CSV and browser print/PDF output. Exports use the test records held in the current page session. Export before refreshing or closing the page.

## Modbus note

Enter the average Modbus flow rate in L/min for the same physical collection interval. For best comparison, use multiple readings collected across the interval rather than one instantaneous snapshot.

## Important

This tool supports field comparison and record keeping. It is not a substitute for accredited calibration or a calibration certificate. Use a calibrated collection vessel or weighing reference and apply the permissible error limits from the exact meter specification.
