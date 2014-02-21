//DEBUG boolean, should debug console prints be shown
var DEBUG = true;

//boolean values as objects so that they are mutable form inside the button listener
var showingPrimarySchools = {value: false};
var showingSecondarySchools = {value: true};

function redraw() {
  clean(); //remove everything
  
  if(DEBUG) {
	console.log("Showing Primary Schools: " + showingPrimarySchools.value);
	console.log("Showing Secondary Schools: " + showingSecondarySchools.value);
  }

  if(showingPrimarySchools.value) { //if supposed to be drawing; draw.
    draw("primary");
  }
  
  if(showingSecondarySchools.value) {
    draw("secondary");
  }
}

//draw all schools of the given type
//types "secondary", "primary"
function draw(type) {
  for(var key in schools){
    if(schools[key].type == type){
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
	for (var key in dataZones) {
    dataZones[key].draw(type);
	}
}

var map; //holds the map

var mapStyles = [ { "featureType": "poi", "stylers": [ { "weight": 1.9 }, { "visibility": "off" } ] },{ "featureType": "poi.school", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.man_made", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.natural", "stylers": [ { "visibility": "off" } ] } ] ;

//called on load
function initialize() {
  var centerLatlng = new google.maps.LatLng(56.632064, -3.729858); //The centre of Scotland
  var mapOptions = {
    zoom: 7,
    center: centerLatlng ,
	disableDefaultUI: true,
    panControl: false,
    zoomControl: true,
    scaleControl: false,
    mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
      }
  }
  
  var mapDiv = document.getElementById('map-canvas');
  map = new google.maps.Map(mapDiv, mapOptions); //create the map

  map.setOptions({styles : mapStyles});
  
  var defaultBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(61.037012, -9.294434),
      new google.maps.LatLng(55.788929, 0.780029));
  
  var defStyle = [{}];
  var markers = [];
  
  var styledMap = new google.maps.StyledMapType(defStyle, {name: "Default"});
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');

  searchBar(); //do all actions related to the search bar
  
  button(" Primary ", showingPrimarySchools);
  button(" Secondary ", showingSecondarySchools);

  var deprivationTypes = {
    'crime': 'crime',
    'education': 'education',
    'employment': 'employment',
    'geographicAccess': 'geographic access',
    'health': 'health',
    'housing': 'housing',
    'income': 'income',
    'overall': 'overall'
  };
  
  for(var key in deprivationTypes){
    deprivationButtons.push(new DeprivationButton(key, deprivationTypes[key]));
  }

  infoBox();
  
  for(var key in schools){
    schools[key].draw();
    for(var i = 0; i < schools[key].conns.length; i++){
      schools[key].conns[i].draw();
    }
  }
  for(var key in dataZones) {
    numZones++;
  }
  
  redraw(); //draw all schools
  setDeprivationType("education", false);
}
  
function searchBar() {
  var markers = [];
  var input = (document.getElementById('pac-input'));
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  var searchBox = new google.maps.places.SearchBox(input);

  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    var places = searchBox.getPlaces();

    for (var i = 0, marker; marker = markers[i]; i++) {
      marker.setMap(null);
    }
  
    //For each place, get the icon, place name, and location.
    markers = [];
    var bounds = new google.maps.LatLngBounds();
  
    for (var i = 0, place; place = places[i]; i++) {
	alert();
      var image = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: map,
        icon: image,
        title: place.name,
        position: place.geometry.location
      }); 

      markers.push(marker);
	  bounds.extend(place.geometry.location);
    }

    map.fitBounds(bounds);
  });


  //Bias the SearchBox results towards places that are within the bounds of the current map's viewport.
  google.maps.event.addListener(map, 'bounds_changed', function() {
    var bounds = new google.maps.LatLngBounds(new google.maps.LatLng(61.037012, -9.294434),
											  new google.maps.LatLng(55.788929, 0.780029));
    searchBox.setBounds(bounds);
  });
}

var showing = false;
var helpText = "The map shows the schools of Scotland as blue circles, the larger the school, the larger the circle.<br>The data zones (see <a href=\"http://www.opendatascotland.org/\">opendatascotland.org</a>) that sends students to a school are connected to that school with a black line.<br>The opacity of the line scales with the number of students comming from the data zone.<br>Finaly the data zones are coloured on a green to red scale according to their Multiple Deprivation Index, red is bad, green is good.";

function infoBox() {
  var textBox = document.getElementById('textBox');
  var cross = document.getElementById('boxCross');
  textBox.innerHTML = "Click for info";
  textBox.style.width = '138px';
	
  google.maps.event.addDomListener(textBox, 'click', function() {
	showing = !showing;
    if(showing) {
	  textBox.innerHTML = helpText;
	  textBox.appendChild(cross);
	  textBox.style.width = '280px';
	} else {
	  textBox.innerHTML = "Click for info";
	  textBox.style.width = '138px';
	}
  });
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(textBox);
}

var deprivationButtons = []
var currentDeprivation;
// It gets drawn, then hidden.
var dataZonesVisible = true;

function toggleDataZones(){
  for(var key in dataZones){
    if(dataZonesVisible)
      dataZones[key].hide();
    else
      dataZones[key].show();
  }
  dataZonesVisible = !dataZonesVisible;
}

function DeprivationButton(type, name){
  var controlDiv = document.createElement('div');
  
  this.selected = false;
  this.type = type;
  this.name = name;
  //setting the visual variables -->
  controlDiv.style.padding = '5px';
  
  var controlUI = document.getElementById('button').cloneNode(false);
  controlDiv.appendChild(controlUI);
  this.ui = controlUI;

  var controlText = document.getElementById('buttonText').cloneNode(false);
  controlText.innerHTML = "Show " + name + " deprivation";
  controlUI.appendChild(controlText);
  this.textui = controlText;
  
  var this_ = this;
  google.maps.event.addDomListener(controlUI, 'click', function() {
    if(this_.selected){
      setDeprivationType(this_.type, !dataZonesVisible);
    }
    else{
      this_.selected = !this_.selected;
      setDeprivationType(this_.type, true);
    }
  });
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(controlDiv);
}

function setDeprivationType(type, visible){
  if(type != currentDeprivation){
    for(var i = 0; i < deprivationButtons.length; i++){
      if(deprivationButtons[i].type == type && visible){
        deprivationButtons[i].textui.innerHTML = "Hide " +
          deprivationButtons[i].name + " deprivation";
        deprivationButtons[i].selected = true;
        deprivationButtons[i].ui.style.backgroundColor = '#99ff66';
      }
      else{
        deprivationButtons[i].textui.innerHTML = "Show " +
          deprivationButtons[i].name + " deprivation";
        deprivationButtons[i].selected = false;
        deprivationButtons[i].ui.style.backgroundColor = '#dddddd';
      }
    }
    drawZones(type);
  }
  if(dataZonesVisible != visible)
    toggleDataZones();
}

function button(type, bool) {
  var homeControlDiv = document.createElement('div');
  var bc = new buttonControl(homeControlDiv, type, bool);
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(homeControlDiv);
}

function buttonControl(controlDiv, type, bool) {
  //button names and colours
  var startDrawing = "Show" + type + "Schools";
  var stopDrawing = "Hide" + type + "Schools";
  var info = "Toggle" + type + "Schools";
  var showColor = "#dddddd";
  var hideColor = "#99FF66";
  
  //setting the visual variables -->
  controlDiv.style.padding = '5px';

  var controlUI = document.getElementById('button').cloneNode(false);
  controlUI.style.backgroundColor = bool.value ? hideColor : showColor;
  controlUI.title = info;
  controlDiv.appendChild(controlUI);
  
  var controlText = document.getElementById('buttonText').cloneNode(false);
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

var numZones = 0

//Draws a zone with a colour that scales from Green to Red depending on the rank supplied

var openInfoWindow = null;
