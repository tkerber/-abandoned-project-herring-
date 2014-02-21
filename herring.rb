#!/usr/bin/ruby
require 'open-uri'
require 'uri'

CONNS_SPARQL = 'SELECT ?email ?zone ?strength WHERE{
  ?school <http://www.w3.org/2006/vcard/ns#hasEmail> ?email.
  ?school <http://data.ordnancesurvey.co.uk/ontology/postcode/postcode> ?pc.
  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?slat.
  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?slong.
  ?nop <http://data.opendatascotland.org/def/education/numberOfPupils> ?strength.
  ?nop <http://data.opendatascotland.org/def/statistical-dimensions/education/school> ?school.
  ?nop <http://data.opendatascotland.org/def/statistical-dimensions/refArea> ?zone.
}
ORDER BY ?email'

SCHOOLS_SPARQL = 'SELECT ?email ?lat ?long (SUM (?nop) as ?size) ?name ?type
WHERE{
  ?school <http://data.ordnancesurvey.co.uk/ontology/postcode/postcode> ?pc.
  ?school <http://www.w3.org/2006/vcard/ns#hasEmail> ?email.
  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat.
  ?pc <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.
  OPTIONAL{
    ?school <http://www.w3.org/2000/01/rdf-schema#label> ?name
  }
  GRAPH <http://data.opendatascotland.org/graph/education/pupils-by-school-and-datazone>{
    ?x <http://data.opendatascotland.org/def/statistical-dimensions/education/school> ?school.
    ?x <http://data.opendatascotland.org/def/education/numberOfPupils> ?nop.
  }
  ?school <http://data.opendatascotland.org/def/education/department> ?dep.
  ?dep <http://data.opendatascotland.org/def/education/stageOfEducation> ?type.
}
GROUP BY ?email ?lat ?long ?size ?name ?type
ORDER BY ?email'

ZONES_SPARQL = 'SELECT ?zone ?%{type} ?lat ?long
WHERE{
  ?ranktable <http://data.opendatascotland.org/def/statistical-dimensions/refPeriod> <http://reference.data.gov.uk/id/year/2012>.
  ?ranktable <http://data.opendatascotland.org/def/statistical-dimensions/refArea> ?zone.
  ?ranktable <http://data.opendatascotland.org/def/simd/%{type}> ?%{type}.
  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat.
  ?zone <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long.
}'

def sparql_to_url(sparql)
  url = 'http://data.opendatascotland.org/sparql.csv?query=' +
    URI::encode(sparql)
end

puts 'getting conns...'
f = open('conns.csv', 'w')
page = 1
written = true
while written
  written = false
  conn = open(sparql_to_url(CONNS_SPARQL) +
    "&page=#{page}&per_page=25000")
  first = true
  conn.each_line do |l|
    if first && page != 1
      first = false
      next
    end
    f.puts l
    written = true
  end
  conn.close
  page += 1
end
f.close
puts 'getting schools...'
c = open(sparql_to_url(SCHOOLS_SPARQL), &:read)
f = open('schools.csv', 'w')
f.write c
f.close
puts 'getting zones...'
zones = {}
deprivation_types = ['crimeRank', 'educationRank', 'employmentRank', 'geographicAccessRank', 'healthRank', 'housingRank', 'incomeRank', 'rank']
deprivation_types.each do |type|
  puts "getting for deprivation type #{type}"
  conn = open(sparql_to_url(ZONES_SPARQL.gsub('%{type}', type)))
  conn.each_line do |l|
    l = l.strip.split ','
    zones[l[0]] = [l[2], l[3]] unless zones.include? l[0]
    zones[l[0]] << l[1]
  end
  conn.close
end
f = open('zones.csv', 'w')
zones.each do |zone, data|
  f.puts (zone + ',' + data.join(','))
end
f.close
puts 'done.'
