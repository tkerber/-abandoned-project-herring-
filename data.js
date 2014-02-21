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
var typePrefix = "http://data.opendatascotland.org/def/concept/education/stages-of-education/";

function DataZone(data){
  this.latLong = new google.maps.LatLng(parseFloat(data[1]),
    parseFloat(data[2]));
  this.crimeRank = parseInt(data[3]);
  this.educationRank = parseInt(data[4]);
  this.employmentRank = parseInt(data[5]);
  this.geographicAccessRank = parseInt(data[6]);
  this.healthRank = parseInt(data[7]);
  this.housingRank = parseInt(data[8]);
  this.incomeRank = parseInt(data[9]);
  this.overallRank = parseInt(data[10]);
  this.conns = [];
}

function rgbByRank(rank) {
	var green = 0;
	var red = 0;
	var blue = 0;
	if (2*rank/numZones < 1) {
		green = Math.floor(2*255*(rank/numZones));
		red = 255
	}
	else {
		green = 255 ;
		red = 2*Math.floor(255 - 255*(rank/numZones)) ;
	}
	return ('rgb(' + red + ',' + green + ',' + blue + ')') ;
}

DataZone.prototype.draw = function(type){
  var rank = this[type + 'Rank'];
  var options = {
    strokeColor: rgbByRank(rank),
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: rgbByRank(rank),
    fillOpacity: 0.8,
    map: map,
    center: this.latLong,
    radius: 100
  };
  if(this.ui)
    this.ui.setOptions(options);
  else{
    var circ = new google.maps.Circle(options);
    this.ui = circ;
  }
}

function School(data){
  this.email = data[0];
  this.name = data[4];
  this.lat = parseFloat(data[1]);
  this.lng = parseFloat(data[2]);
  this.latLong = new google.maps.LatLng(this.lat, this.lng);
  this.size = parseInt(data[3]);
  this.type = data[5].replace(typePrefix, "");
  this.conns = [];
}

School.prototype.draw = function(){
  if(this.ui)
    return;
  var options = {
    strokeColor: '#0ebfe9',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#0ebfe9',
    fillOpacity: 0.25,
    map: map,
    center: this.latLong,
    radius: (this.size * 0.5)
  };
  
  var circ = new google.maps.Circle(options);
  this.ui = {
    'circle': circ,
    'infowindow': new google.maps.InfoWindow({
      content: '<p><b><u>' + this.name + "</u>" + 
	  "<br>Type: " + this.type + 
	  "<br>Students: " + this.size + '</b></p>',
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
