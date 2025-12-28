// ============================================================
// ADD THIS TO YOUR EXISTING GOOGLE APPS SCRIPT (Code.gs)
// ============================================================

// Add this case to your existing doGet function's switch statement:
//
// case 'getLookups':
//   return ContentService.createTextOutput(JSON.stringify(getLookups()))
//     .setMimeType(ContentService.MimeType.JSON);

function getLookups() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get Suppliers (Column A = Name, Column B = Active)
    const suppliersSheet = ss.getSheetByName('Suppliers');
    const suppliers = [];
    if (suppliersSheet) {
      const suppliersData = suppliersSheet.getDataRange().getValues();
      for (let i = 1; i < suppliersData.length; i++) { // Skip header row
        const name = suppliersData[i][0];
        const active = suppliersData[i][1];
        if (name && (active === 'Yes' || active === 'yes' || active === true || active === 'TRUE')) {
          suppliers.push(name.toString().trim());
        }
      }
    }

    // Get Vehicles (Column A = ID, Column B = Name, Column C = Active)
    const vehiclesSheet = ss.getSheetByName('Vehicles');
    const vehicles = [];
    if (vehiclesSheet) {
      const vehiclesData = vehiclesSheet.getDataRange().getValues();
      for (let i = 1; i < vehiclesData.length; i++) {
        const id = vehiclesData[i][0];
        const name = vehiclesData[i][1];
        const active = vehiclesData[i][2];
        if (name && (active === 'Yes' || active === 'yes' || active === true || active === 'TRUE')) {
          vehicles.push({ id: id.toString(), name: name.toString().trim() });
        }
      }
    }

    // Get Equipment (Column A = ID, Column B = Name, Column C = Active)
    const equipmentSheet = ss.getSheetByName('Equipment');
    const equipment = [];
    if (equipmentSheet) {
      const equipmentData = equipmentSheet.getDataRange().getValues();
      for (let i = 1; i < equipmentData.length; i++) {
        const id = equipmentData[i][0];
        const name = equipmentData[i][1];
        const active = equipmentData[i][2];
        if (name && (active === 'Yes' || active === 'yes' || active === true || active === 'TRUE')) {
          equipment.push({ id: id.toString(), name: name.toString().trim() });
        }
      }
    }

    // Get Tractors (Column A = ID, Column B = Name, Column C = Active)
    const tractorsSheet = ss.getSheetByName('Tractors');
    const tractors = [];
    if (tractorsSheet) {
      const tractorsData = tractorsSheet.getDataRange().getValues();
      for (let i = 1; i < tractorsData.length; i++) {
        const id = tractorsData[i][0];
        const name = tractorsData[i][1];
        const active = tractorsData[i][2];
        if (name && (active === 'Yes' || active === 'yes' || active === true || active === 'TRUE')) {
          tractors.push({ id: id.toString(), name: name.toString().trim() });
        }
      }
    }

    // Get Farms (Column A = Name, Column B = Active) - Optional sheet
    const farmsSheet = ss.getSheetByName('Farms');
    const farms = [];
    if (farmsSheet) {
      const farmsData = farmsSheet.getDataRange().getValues();
      for (let i = 1; i < farmsData.length; i++) {
        const name = farmsData[i][0];
        const active = farmsData[i][1];
        if (name && (active === 'Yes' || active === 'yes' || active === true || active === 'TRUE')) {
          farms.push(name.toString().trim());
        }
      }
    }

    // Get Departments (Column A = Name, Column B = Active) - Optional sheet
    const departmentsSheet = ss.getSheetByName('Departments');
    const departments = [];
    if (departmentsSheet) {
      const departmentsData = departmentsSheet.getDataRange().getValues();
      for (let i = 1; i < departmentsData.length; i++) {
        const name = departmentsData[i][0];
        const active = departmentsData[i][1];
        if (name && (active === 'Yes' || active === 'yes' || active === true || active === 'TRUE')) {
          departments.push(name.toString().trim());
        }
      }
    }

    return {
      success: true,
      lookups: {
        suppliers: suppliers.sort((a, b) => a.localeCompare(b)),
        vehicles: vehicles.sort((a, b) => a.name.localeCompare(b.name)),
        equipment: equipment.sort((a, b) => a.name.localeCompare(b.name)),
        tractors: tractors.sort((a, b) => a.name.localeCompare(b.name)),
        farms: farms.length > 0 ? farms.sort((a, b) => a.localeCompare(b)) : null,
        departments: departments.length > 0 ? departments.sort((a, b) => a.localeCompare(b)) : null
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================================
// UPDATED doGet FUNCTION - Replace your existing doGet with this:
// ============================================================
function doGet(e) {
  const action = e.parameter.action;

  // Set CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    switch(action) {
      case 'getOrders':
        return ContentService.createTextOutput(JSON.stringify(getOrders()))
          .setMimeType(ContentService.MimeType.JSON);

      case 'addOrder':
        const orderData = JSON.parse(e.parameter.order);
        return ContentService.createTextOutput(JSON.stringify(addOrder(orderData)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'updateOrder':
        const updateData = JSON.parse(e.parameter.order);
        return ContentService.createTextOutput(JSON.stringify(updateOrder(updateData)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'sendCode':
        const email = e.parameter.email;
        const name = e.parameter.name;
        const code = e.parameter.code;
        return ContentService.createTextOutput(JSON.stringify(sendLoginCode(email, name, code)))
          .setMimeType(ContentService.MimeType.JSON);

      // NEW: Add this case for lookups
      case 'getLookups':
        return ContentService.createTextOutput(JSON.stringify(getLookups()))
          .setMimeType(ContentService.MimeType.JSON);

      default:
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
