var connsSparql = ([
"SELECT ?email ?school_lat ?school_long ?data_lat ?data_long ?strength",
"WHERE{",
"  ?school <http://data.ordnancesurvey.co.uk/ontology/postcode/postcode> ?pc.",
"  ?school <http://www.w3.org/2006/vcard/ns#hasEmail> ?email.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?school_lat.",
"  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?school_long.",
"  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?data_lat.",
"  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?data_long.",
"  ?nop <http://data.opendatascotland.org/def/education/numberOfPupils> ?strength.",
"  ?nop <http://data.opendatascotland.org/def/statistical-dimensions/education/school> ?school.",
"  ?nop <http://data.opendatascotland.org/def/statistical-dimensions/refArea> ?zone.",
"  ?school <http://data.opendatascotland.org/def/education/department> ?dep.",
"  ?dep <http://data.opendatascotland.org/def/education/stageOfEducation> <http://data.opendatascotland.org/def/concept/education/stages-of-education/%{stage}>.",
"}",
"ORDER BY ?email"]).join("\n");

var connsUrl = "http://data.opendatascotland.org/sparql.csv?query=" + encodeURIComponent(connsSparql);

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

var schoolsUrl = "http://data.opendatascotland.org/sparql.csv?query=" + encodeURIComponent(schoolsSparql);

var schools = [];


// schoolType one of "secondary", "primary", "pre-school"
function requestData(schoolType){
  clean();
  var connsUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(connsSparql) + "&stage=" +
    encodeURIComponent(schoolType);
  var schoolsUrl = "http://data.opendatascotland.org/sparql.csv?query=" +
    encodeURIComponent(schoolsSparql) + "&stage=" +
    encodeURIComponent(schoolType);
  $.ajax({
    dataType: 'text',
    url: schoolsUrl,
    success: function(data){
      data = data.split("\n");
      for(var i = 1; i < data.length - 1; i++){
        var row = data[i].split(',');
        schools.push({
          'email': row[0],
          'name': row[4],
          'latLong': new google.maps.LatLng(parseFloat(row[1]),
              parseFloat(row[2])),
          'size': parseInt(row[3]),
          'conns': []
        });
      }
      $.ajax({
        dataType: 'text',
        url: connsUrl,
        success: function(data){
          data = data.split("\n");
          var j = 0;
          for(var i = 1; i < data.length - 1; i++){
            var row = data[i].split(',');
            while(schools[j].email != row[0])
              j++;
            schools[j].conns.push({
              'latLong': new google.maps.LatLng(parseFloat(row[3]),
                  parseFloat(row[4])),
              'strength': parseInt(row[5])
            });
          }
          drawConns();
          drawSchools();
        }
      });
    }
  });
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

