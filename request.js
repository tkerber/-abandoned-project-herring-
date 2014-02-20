
function requestData(){
  var schoolsUrl = "schools.csv";
  // Get school data.
  $.ajax({
    dataType: 'text',
    url: schoolsUrl,
    success: function(data){
      data = csvToArray(data);
      for(var i = 1; i < data.length - 2; i++){
        schools[data[i][0]] = new School(data[i]);
      }
      schoolsAcquired = true;
      requestConnData(1);
    }
  });
  var zonesUrl = "zones.csv";
  // Get data zones data.
  $.ajax({
    dataType: 'text',
    url: zonesUrl,
    success: function(data){
      data = csvToArray(data);
      for(var i = 1; i < data.length - 2; i++){
        dataZones[data[i][0]] = new DataZone(data[i]);
      }
      dataZonesAcquired = true;
      requestConnData(1);
    }
  });
}

var schoolsAcquired = false;
var dataZonesAcquired = false;

function requestConnData(page){
  if(!(schoolsAcquired && dataZonesAcquired))
    return;
  var connsUrl = "conns.csv";
  $.ajax({
    dataType: 'text',
    url: connsUrl,
    success: function(data){
      var found = false;
      data = csvToArray(data);
      for(var i = 1; i < data.length - 2; i++){
        if(!(data[i][0] in schools && data[i][1] in dataZones))
          continue;
        var conn = new Connection(data[i]);
        schools[data[i][0]].conns.push(conn);
        dataZones[data[i][1]].conns.push(conn);
      }
      initialize();
    }
  });
}

requestData();
