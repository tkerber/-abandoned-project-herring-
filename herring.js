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

var DEBUG = true;

// schoolType one of "secondary", "primary", "pre-school"
//do not call directly, called from "redraw()"
function requestData(schoolType){
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
        drawConns();
        drawSchools();
        testZones();
      }
    }
  });
}

//boolean values as objects so that they are mutable form inside the button listener
var showingPreSchools = {value: false};
var showingPrimarySchools = {value: false};
var showingSecondarySchools = {value: true};

//TODO make redraw hide and show objects rather than re-calling the database.
function redraw() {
  clean(); //remove everything
  
  if(DEBUG) {
	console.log("Showing Pre-Schools: " + showingPreSchools.value);
	console.log("Showing Primary Schools: " + showingPrimarySchools.value);
	console.log("Showing Secondary Schools: " + showingSecondarySchools.value);
  }
  
  if(showingPreSchools.value) { //if supposed to be drawing; draw.
    requestData("pre-school");
  }
  
  if(showingPrimarySchools.value) {
    requestData("primary");
  }
  
  if(showingSecondarySchools.value) {
    requestData("secondary");
  }
}

redraw();

//removed all currently drawing map objects.
function clean() {
  for(var key in schools){ 
    schools[key].ui.circle.setMap(null);
    schools[key].ui.infowindow.close();
    for(var j = 0; j < schools[key].conns.length; j++){
      var conn = schools[key].conns[j];
      if(conn.ui)
        schools[key].conns[j].ui.setMap(null);
    }
  }
  schools = [];
}

function drawSchools(data){
  for(var key in schools){
    drawSchool(schools[key]);
  }
}

function drawConns(data){
  for(var key in schools){
    for(var i = 0; i < schools[key].conns.length; i++){
      var conn = schools[key].conns[i];
      if(conn.strength < 10)
        continue;
      drawPath(schools[key], conn);
    }
  }
}

var zones = []

function testZones() {
	zones.push({
		"ui" : null,
		"latLong" : new google.maps.LatLng(56.632064, -3.729858),
		"rank" : {
			"income" : 100,
			"crime" : 6505,
			"education" : 1,
			"employment" : 1000,
			"health" : 2000,
			"overall" : 3000,
			"housing" : 4000
		}
	});
	drawZones("Education");
}

//Accepts the arguments Overall, Crime, Education, Income, Employment, Health and Housing
function drawZones(type) {
	for (var i = 0 ; i < zones.length ; i++) {
		switch (type) {
		case "Crime" : drawZone(zones[i], zones[i].rank.crime);
			break;
		case "Education" : drawZone(zones[i], zones[i].rank.education);
		    break;
		case "Income" : drawZone(zones[i], zones[i].rank.income);
			break;
		case "Employment" : drawZone(zones[i], zones[i].rank.employment);
		    break;
		case "Overall" : drawZone(zones[i], zones[i].rank.overall);
			break;
		case "Health" : drawZone(zones[i], zones[i].rank.health);
			break;
		case "Housing" : drawZone(zones[i], zones[i].rank.housing);
			break;
		default : drawZone(zones[i], zones[i].rank.education);
			break;
		}
	}
}

var map;

var mapStyles = [ { "featureType": "poi", "stylers": [ { "weight": 1.9 }, { "visibility": "off" } ] },{ "featureType": "poi.school", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.man_made", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.natural", "stylers": [ { "visibility": "off" } ] } ] ;


function initialize() {
  var centerLatlng = new google.maps.LatLng(56.632064, -3.729858); //The centre of Scotland
  var mapOptions = {
    zoom: 7,
	disableDefaultUI: true,
    center: centerLatlng ,
    mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
      }
  }
  
  var mapDiv = document.getElementById('map-canvas');
  map = new google.maps.Map(mapDiv, mapOptions);

  map.setOptions({styles : mapStyles})
  
  var defStyle = [{}]
 
  var styledMap = new google.maps.StyledMapType(defStyle, {name: "Default"});
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');

  button(" Pre-", showingPreSchools);
  button(" Primary ", showingPrimarySchools);
  button(" Secondary ", showingSecondarySchools);
}

function button(type, bool) {
  var homeControlDiv = document.createElement('div');
  var bc = new buttonControl(homeControlDiv, type, bool);
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(homeControlDiv);  
}

function buttonControl(controlDiv, type, bool) {
  var startDrawing = "Show" + type + "Schools";
  var stopDrawing = "Hide" + type + "Schools";
  var info = "Toggle" + type + "Schools";
  var showColor = "green";
  var hideColor = "red";
  
  controlDiv.style.padding = '5px';

  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = bool.value ? hideColor : showColor;
  controlUI.style.width = '160px';
  controlUI.style.borderStyle = 'solid';
  controlUI.style.borderWidth = '2px';
  controlUI.style.cursor = 'pointer';
  controlUI.style.textAlign = 'center';
  controlUI.title = info;
  controlDiv.appendChild(controlUI);

  var controlText = document.createElement('div');
  controlText.style.fontFamily = 'Arial,sans-serif';
  controlText.style.fontSize = '12px';
  controlText.style.paddingLeft = '4px';
  controlText.style.paddingRight = '4px';
  controlText.innerHTML = bool.value ? stopDrawing : startDrawing;
  controlUI.appendChild(controlText);

  google.maps.event.addDomListener(controlUI, 'click', function() {
	bool.value = !bool.value; //toggle the drawing state
	
    if(bool.value) { //if drawing
	  controlText.innerHTML = stopDrawing; //set button text to "stop drawing"
      controlUI.style.backgroundColor = hideColor;
	} else {
	  controlText.innerHTML = startDrawing; // set button text to "draw"
	  controlUI.style.backgroundColor = showColor;
	}
	redraw(); //redraw all the schools
  });
}

function drawPath(LatSchool, LongSchool, LatDataZone, LongDataZone) {
  drawPath(map, new google.maps.LatLng(LatSchool, LongSchool),
			new google.maps.LatLng(LatDataZone, LongDataZone)
  );
}

function drawPath(school, conn) {
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

var openInfoWindow = null;

function drawSchool(school) {
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
      content: '<p><b><u>' + school.name + "</u><br>Students: " + school.size +  '</b></p>',
      position: circ.center
    })
  }
  
  google.maps.event.addListener(school.ui.circle, 'mouseover', function() {
    if(openInfoWindow != null) {
	  openInfoWindow.close();
    }
	
	if (map.getZoom() > 8) {
	  openInfoWindow = school.ui.infowindow;
	  openInfoWindow.open(map);
	  
	}
  });
  /*
  google.maps.event.addListener(school.ui.circle, 'mouseout', function() {
    school.ui.infowindow.close();
  });*/
}


var numZones = 6000

//Draws a zone with a colour that scales from Green to Red depending on the rank supplied
function drawZone(zone, rank) {
	  var options = {
	    strokeColor: 'rgb(' + 0 + ',' + Math.round(255 - 255*(rank/numZones)) + ',' + Math.round(255*(rank/numZones)) + ')',
	    strokeOpacity: 0.8,
	    strokeWeight: 2,
	    fillColor: 'rgb(' + 0 + ',' + Math.round(255 - 255*(rank/numZones)) + ',' + Math.round(255*(rank/numZones)) + ')',
	    fillOpacity: 0.8,
	    map: map,
	    center: zone.latLong,
	    radius: 500
	  };
	  var circ = new google.maps.Circle(options);
	  zone.ui = {
			  'circle' : circ
	  };
}
//on load, run initialize
google.maps.event.addDomListener(window, 'load', initialize);

