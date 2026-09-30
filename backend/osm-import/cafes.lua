-- Definiert die Zieltabelle "cafes" in PostGIS.
-- osm2pgsql legt automatisch eine Geometriespalte + Primärschlüssel an.
local cafes = osm2pgsql.define_node_table('cafes', {
    { column = 'name',       type = 'text' },
    { column = 'cuisine',    type = 'text' },
    { column = 'vegan',      type = 'text' },
    { column = 'vegetarian', type = 'text' },
    { column = 'opening_hours', type = 'text' },
    { column = 'geom',       type = 'point', not_null = true },
})

-- Wird für JEDEN Node in der .osm.pbf-Datei aufgerufen.
-- Wir picken uns hier ausschließlich amenity=cafe heraus, alles andere
-- (Straßen, Gebäude, Wälder, ...) wird verworfen und landet nie in der DB.
function osm2pgsql.process_node(object)
    if object.tags.amenity ~= 'cafe' then
        return
    end

    cafes:insert({
        name       = object.tags.name,
        cuisine    = object.tags.cuisine,
        vegan      = object.tags['diet:vegan'],
        vegetarian = object.tags['diet:vegetarian'],
        opening_hours = object.tags.opening_hours,
        geom       = object:as_point(),
    })
end

-- Hinweis: Cafés sind in OSM so gut wie immer als einzelner Node erfasst,
-- nicht als Way (Gebäudeumriss) oder Relation. Für den MVP reicht das aus.
