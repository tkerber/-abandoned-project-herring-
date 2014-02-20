// adapted from http://www.bennadel.com/blog/1504-Ask-Ben-Parsing-CSV-Strings-With-Javascript-Exec-Regular-Expression-Command.htm
function csvToArray(strData, strDelimiter){
  strDelimiter = (strDelimiter || ",");
  var objPattern = new RegExp((
      "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
      "([^\"\\" + strDelimiter + "\\r\\n]*))"
    ), "gi");
  var arrData = [[]];
  var arrMatches = null;
  while(arrMatches = objPattern.exec(strData)){
    var strMatchedDelimiter = arrMatches[1];
    if(strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)){
      arrData.push([]);
    }
    if(arrMatches[2]){
      var strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"),
        "\"");
    }
    else{
      var strMatchedValue = arrMatches[3];
    }
    arrData[arrData.length - 1].push(strMatchedValue);
  }
  return(arrData);
}
var schools = {};
var dataZones = {};

function DataZone(data){
  this.educationRank = parseInt(data[1]);
  this.latLong = new google.maps.LatLng(parseFloat(data[2]),
    parseFloat(data[3]));
  this.conns = [];
}

function School(data){
  this.email = data[0];
  this.name = data[4];
  this.latLong = new google.maps.LatLng(parseFloat(data[1]),
    parseFloat(data[2]));
  this.size = parseInt(data[3]);
  this.type = data[5];
  this.conns = [];
}

School.prototype.draw = function(){
  if(this.ui)
    return;
  var options = {
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#FF0000',
    fillOpacity: 0.25,
    map: map,
    center: this.latLong,
    radius: (this.size * 0.5)
  };
  
  var circ = new google.maps.Circle(options);
  this.ui = {
    'circle': circ,
    'infowindow': new google.maps.InfoWindow({
      content: '<p><b><u>' + this.name + "</u><br>Students: " + this.size +  '</b></p>',
      position: circ.center
    })
  };
  
  var this_ = this;
  google.maps.event.addListener(this.ui.circle, 'mouseover', function() {
    if(openInfoWindow != null) {
      openInfoWindow.close();
    }
    
    if(map.getZoom() > 8){
      openInfoWindow = this_.ui.infowindow;
      openInfoWindow.open(map);
    }
  });
}

School.prototype.show = function(){
  this.ui.circle.setVisible(true);
}

School.prototype.hide = function(){
  this.ui.circle.setVisible(false);
  this.ui.infowindow.close();
}

function Connection(data){
  this.zone = dataZones[data[1]];
  this.strength = parseInt(data[2]);
  this.school = schools[data[0]];
}

Connection.prototype.draw = function(){
  if(this.ui || this.strength < 10)
    return;
  var options = {
    path: [this.zone.latLong, this.school.latLong],
    strokeOpacity: Math.min(1.0, (Math.log(this.strength) - 2) / 2),
    strokeWeight: 1.0,
    icons: [{
      offset: '100%'
    }],
    map: map
  };
  
  this.ui = new google.maps.Polyline(options);
}

Connection.prototype.show = function(){
  if(this.ui)
    this.ui.setVisible(true);
}

Connection.prototype.hide = function(){
  if(this.ui)
    this.ui.setVisible(false);
}


var connsSparql = ([
"SELECT ?email ?zone ?strength",
"WHERE{",
"  ?school <http://www.w3.org/2006/vcard/ns#hasEmail> ?email.",
"  ?school <http://data.ordnancesurvey.co.uk/ontology/postcode/postcode> ?pc.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?slat.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?slong.",
"  ?nop <http://data.opendatascotland.org/def/education/numberOfPupils> ?strength.",
"  ?nop <http://data.opendatascotland.org/def/statistical-dimensions/education/school> ?school.",
"  ?nop <http://data.opendatascotland.org/def/statistical-dimensions/refArea> ?zone.",
"}",
"ORDER BY ?email"]).join("\n");

var schoolsSparql = ([
"SELECT ?email ?lat ?long (SUM (?nop) as ?size) ?name ?type",
"WHERE{",
"  ?school <http://data.ordnancesurvey.co.uk/ontology/postcode/postcode> ?pc.",
"  ?school <http://www.w3.org/2006/vcard/ns#hasEmail> ?email.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.",
"  OPTIONAL{",
"    ?school <http://www.w3.org/2000/01/rdf-schema#label> ?name",
"  }",
"  GRAPH <http://data.opendatascotland.org/graph/education/pupils-by-school-and-datazone>{",
"    ?x <http://data.opendatascotland.org/def/statistical-dimensions/education/school> ?school.",
"    ?x <http://data.opendatascotland.org/def/education/numberOfPupils> ?nop.",
"  }",
"  ?school <http://data.opendatascotland.org/def/education/department> ?dep.",
"  ?dep <http://data.opendatascotland.org/def/education/stageOfEducation> ?type.",
"}",
"GROUP BY ?email ?lat ?long ?size ?name ?type",
"ORDER BY ?email"]).join("\n");

// zone crime rank, education rank, employment rank, geographic access rank,
// health rank, housing rank, income rank, overall rank
var zonesSparql = ([
"SELECT ?zone ?er ?lat ?long",
"WHERE{",
"  ?ere <http://data.opendatascotland.org/def/statistical-dimensions/refPeriod> <http://reference.data.gov.uk/id/year/2012>.",
"  ?ere <http://data.opendatascotland.org/def/statistical-dimensions/refArea> ?zone.",
"  ?ere <http://data.opendatascotland.org/def/simd/educationRank> ?er.",
"  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat.",
"  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.",
"}"]).join("\n");

function requestData(){
  var schoolsUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(schoolsSparql);
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
  var zonesUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(zonesSparql);
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
  var connsUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(connsSparql) + "&per_page=10000&page=" + page;
  $.ajax({
    dataType: 'text',
    url: connsUrl,
    success: function(data){
      var found = false;
      data = csvToArray(data);
      if(data.length > 2)
        found = true;
      for(var i = 1; i < data.length - 2; i++){
        if(!(data[i][0] in schools && data[i][1] in dataZones))
          continue;
        var conn = new Connection(data[i]);
        schools[data[i][0]].conns.push(conn);
        dataZones[data[i][1]].conns.push(conn);
      }
      if(found){
        requestConnData(page + 1);
      }
      else{
        initialize();
      }
    }
  });
}

requestData();
