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
"  ?school <http://data.opendatascotland.org/def/education/department> ?dep.",
"  ?dep <http://data.opendatascotland.org/def/education/stageOfEducation> <http://data.opendatascotland.org/def/concept/education/stages-of-education/%{stage}>.",
"}",
"ORDER BY ?email"]).join("\n");

var schoolsSparql = ([
"SELECT ?email ?lat ?long (SUM (?nop) as ?size) ?name",
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
"  ?dep <http://data.opendatascotland.org/def/education/stageOfEducation> <http://data.opendatascotland.org/def/concept/education/stages-of-education/%{stage}>.",
"}",
"GROUP BY ?email ?lat ?long ?size ?name",
"ORDER BY ?email"]).join("\n");

var schools = {};


// schoolType one of "secondary", "primary", "pre-school"
function requestData(schoolType){
  clean();
  var schoolsUrl = "http://data.opendatascotland.org/sparql.json?query=" +
    encodeURIComponent(schoolsSparql) + "&stage=" +
    encodeURIComponent(schoolType);
  $.ajax({
    dataType: 'text',
    url: schoolsUrl,
    success: function(data){
      data = JSON.parse(data).results.bindings;
      for(var i = 0; i < data.length - 1; i++){
        schools[data[i].email.value] = {
          'email': data[i].email.value,
          'name': data[i].name ? data[i].name.value : null,
          'latLong': new google.maps.LatLng(parseFloat(data[i].lat.value),
              parseFloat(data[i].long.value)),
          'size': parseInt(data[i].size.value),
          'conns': []
        };
      }
      requestConnData(schoolType, 1);
    }
  });
}

function requestConnData(schoolType, page){
  var connsUrl = "http://data.opendatascotland.org/sparql.json?query=" +
    encodeURIComponent(connsSparql) + "&stage=" +
    encodeURIComponent(schoolType) + "&per_page=10000&page=" + page;
  $.ajax({
    dataType: 'text',
    url: connsUrl,
    success: function(data){
      var found = false;
      data = JSON.parse(data).results.bindings;
      if(data.length != 0)
        found = true;
      for(var i = 0; i < data.length - 1; i++){
        if(!(data[i].email.value in schools))
          continue;
        schools[data[i].email.value].conns.push({
          'latLong': new google.maps.LatLng(parseFloat(data[i].lat.value),
              parseFloat(data[i].long.value)),
          'strength': parseInt(data[i].strength.value)
        });
      }
      if(found){
        requestConnData(schoolType, page + 1);
      }
      else{
        flattenSchools();
        drawConns();
        drawSchools();
      }
    }
  });
}

function flattenSchools(){
  var arr = [];
  for(var key in schools){
    arr.push(schools[key]);
  }
  schools = arr;
}

requestData("secondary");

function clean(){
  for(var i = 0; i < schools.length; i++){
    schools[i].ui.circle.setMap(null);
    schools[i].ui.infowindow.close();
    for(var j = 0; j < schools[i].conns.length; j++){
      var conn = schools[i].conns[j];
      if(conn.ui)
        schools[i].conns[j].ui.setMap(null);
    }
  }
  schools = [];
}

function drawSchools(data){
  for(var i = 0; i < schools.length; i++){
    drawSchool(schools[i]);
  }
}

function drawConns(data){
  for(var i = 0; i < schools.length; i++){
    for(var j = 0; j < schools[i].conns.length; j++){
      var conn = schools[i].conns[j];
      if(conn.strength < 10)
        continue;
      drawPath(schools[i], conn);
    }
  }
}

function drawArrow(map, zoneLatLong, schoolLatLong) {}

var map;

var mapStyles = [ { "featureType": "poi", "stylers": [ { "weight": 1.9 }, { "visibility": "off" } ] },{ "featureType": "poi.school", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.man_made", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.natural", "stylers": [ { "visibility": "off" } ] } ] ;


function initialize() {
  var centerLatlng = new google.maps.LatLng(56.632064,-3.729858);
  var mapOptions = {
    zoom: 7,
    center: centerLatlng ,
    mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
      }
  }
  
  var mapDiv = document.getElementById('map-canvas');
  map = new google.maps.Map(mapDiv, mapOptions);

  map.setOptions({styles : mapStyles})
  var x = new google.maps.LatLng(-24.363882, 130.044922);
  
  var defStyle = [{}]
 
  var styledMap = new google.maps.StyledMapType(defStyle,
{name: "Default"});
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');




}

function drawPath(school, conn){
  var options = {
    path: [conn.latLong, school.latLong],
    strokeOpacity: Math.min(1.0, (Math.log(conn.strength) - 2) / 2),
    strokeWeight: 1.0,
    icons: [{
      offset: '100%'
    }],
    map: map
  };
  
  conn.ui = new google.maps.Polyline(options);
} 

function drawSchool(school){
  var options = {
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#FF0000',
    fillOpacity: 0.25,
    map: map,
    center: school.latLong,
    radius: (school.size * 0.5)
  };
  
  var circ = new google.maps.Circle(options);
  school.ui = {
    'circle': circ,
    'infowindow': new google.maps.InfoWindow({
      content: '<p><b>' + school.name + '</b></p><p><b>' + "Enrolment: " + school.size +  '</b></p>',
      position: circ.center
    })
  }
  
  google.maps.event.addListener(school.ui.circle, 'mouseover', function() {
    if (map.getZoom() > 8) {
      school.ui.infowindow.open(map) }
  });
  
  google.maps.event.addListener(school.ui.circle, 'mouseout', function() {
    school.ui.infowindow.close();
  });
}

//on load, run initialize
google.maps.event.addDomListener(window, 'load', initialize);

