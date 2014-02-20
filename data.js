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
  }
  
  google.maps.event.addListener(this.ui.circle, 'mouseover', function() {
    if(openInfoWindow != null) {
      openInfoWindow.close();
    }
    
    if(map.getZoom() > 8){
      openInfoWindow = this.ui.infowindow;
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
  this.latLong = new google.maps.LatLng(parseFloat(data[1]),
    parseFloat(data[2]));
  this.strength = parseInt(data[3]);
  this.school = schools[data[0]];
}

Connection.prototype.draw = function(){
  if(this.ui || this.strength < 10)
    return;
  var options = {
    path: [this.latLong, this.school.latLong],
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
"SELECT ?email ?lat ?long ?strength",
"WHERE{",
"  ?school <http://www.w3.org/2006/vcard/ns#hasEmail> ?email.",
"  ?school <http://data.ordnancesurvey.co.uk/ontology/postcode/postcode> ?pc.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?slat.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?slong.",
"  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat.",
"  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.",
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

// schoolType one of "secondary", "primary", "pre-school"
//do not call directly, called from "redraw()"
function requestData(){
  var schoolsUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(schoolsSparql);
  $.ajax({
    dataType: 'text',
    url: schoolsUrl,
    success: function(data){
      data = csvToArray(data);
      console.log(data);
      for(var i = 1; i < data.length - 2; i++){
        schools[data[i][0]] = new School(data[i]);
      }
      requestConnData(1);
    }
  });
}

function requestConnData(page){
  console.log("reqConn");
  var connsUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(connsSparql) + "&per_page=10000&page=" + page;
  $.ajax({
    dataType: 'text',
    url: connsUrl,
    success: function(data){
      var found = false;
      data = csvToArray(data);
      console.log(data);
      if(data.length > 2)
        found = true;
      for(var i = 1; i < data.length - 2; i++){
        if(!(data[i][0] in schools))
          continue;
        schools[data[i][0]].conns.push(new Connection(data[i]));
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
