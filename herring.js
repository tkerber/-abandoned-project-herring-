
var DEBUG = true;


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
    draw("pre-school");
  }
  
  if(showingPrimarySchools.value) {
    draw("primary");
  }
  
  if(showingSecondarySchools.value) {
    draw("secondary");
  }
}

function draw(type){
  var prefix = "http://data.opendatascotland.org/def/concept/education/stages-of-education/";
  for(var key in schools){
    if(schools[key].type == prefix + type){
      schools[key].show();
      for(var i = 0; i < schools[key].conns.length; i++)
        schools[key].conns[i].show();
    }
  }
}

// hide everything
function clean() {
  for(var key in schools){
    schools[key].hide();
    for(var i =0; i < schools[key].conns.length; i++){
      schools[key].conns[i].hide();
    }
  }
}

function drawZone(map, zoneLatLong){
  drawPoint //what this? //
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

  for(var key in schools){
    schools[key].draw();
    for(var i = 0; i < schools[key].conns.length; i++){
      schools[key].conns[i].draw();
    }
  }
  redraw();
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

var openInfoWindow = null;

