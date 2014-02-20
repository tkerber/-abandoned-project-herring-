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

var map; //holds the map

var mapStyles = [ { "featureType": "poi", "stylers": [ { "weight": 1.9 }, { "visibility": "off" } ] },{ "featureType": "poi.school", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.man_made", "stylers": [ { "visibility": "on" } ] },{ "featureType": "landscape.natural", "stylers": [ { "visibility": "off" } ] } ] ;

//called on load
function initialize() {
  var centerLatlng = new google.maps.LatLng(56.632064, -3.729858); //The centre of Scotland
  var mapOptions = {
    zoom: 7,
	disableDefaultUI: true,
    center: centerLatlng ,
	disableDefaultUI:true,
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

  for(var key in schools){
    schools[key].draw();
    for(var i = 0; i < schools[key].conns.length; i++){
      schools[key].conns[i].draw();
    }
  }
  
  redraw(); //draw all schools
}

//run the initialise function on load
google.maps.event.addDomListener(window, 'load', initialize);

  
function searchBar() {
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
    var bounds = (new google.maps.LatLng(61.037012, -9.294434),
      new google.maps.LatLng(55.788929, 0.780029));
    searchBox.setBounds(bounds);
  });
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
  var showColor = "green";
  var hideColor = "red";
  
  //setting the visual variables -->
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
  // <--
  
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