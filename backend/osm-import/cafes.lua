local cafes = osm2pgsql.define_node_table('cafes', {
    { column = 'name',       type = 'text' },
    { column = 'cuisine',    type = 'text' },
    { column = 'vegan',      type = 'text' },
    { column = 'vegetarian', type = 'text' },
    { column = 'geom',       type = 'point', not_null = true },
})

function osm2pgsql.process_node(object)
    if object.tags.amenity ~= 'cafe' then
        return
    end

    cafes:insert({
        name       = object.tags.name,
        cuisine    = object.tags.cuisine,
        vegan      = object.tags['diet:vegan'],
        vegetarian = object.tags['diet:vegetarian'],
        geom       = object:as_point(),
    })
end