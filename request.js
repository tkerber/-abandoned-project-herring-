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
