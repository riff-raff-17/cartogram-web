function cartogram_init(c_u, cui_u, c_d)
{
    window.cartogram = {

        in_loading_state: false,
        cartogram_url: c_u,
        cartogramui_url: cui_u,
        cartogram_data_dir: c_d,
        color_data: null,
        map_alternates: {
            map2: null,
            map3: null,
            map2_selected: true
        },
        do_nonfatal_error: function(message) {
            document.getElementById('non-fatal-error').innerHTML = message;
        },
        clear_nonfatal_error: function() {
            document.getElementById('non-fatal-error').innerHTML = "";
        },
        do_fatal_error: function(message) {
            document.getElementById('error-message').innerHTML = message;

            document.getElementById('loading').style.display = 'none';
            document.getElementById('cartogram').style.display = 'none';

            document.getElementById('error').style.display = 'block';
        },
        enter_loading_state: function() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('cartogram').style.display = 'none';
            document.getElementById('error').style.display = 'none';

            this.in_loading_state = true;
        },
        exit_loading_state: function() {
            document.getElementById('loading').style.display = 'none';
            this.in_loading_state = false;
        },
        serialize_post_variables: function(vars) {

            var post_string = "";
            var first_entry = true;

            Object.keys(vars).forEach(function(key, index) {

                post_string += (first_entry ? "" : "&" ) + key + "=" + encodeURIComponent(vars[key]);
                first_entry = false;
                
            });

            return post_string;

        },
        highlight_by_id: function(maps, id, value) {

            maps.forEach(function(v){

                elements = document.getElementsByClassName('path-' + v + '-' + id);

                for(i = 0; i < elements.length; i++)
                {
                    elements[i].setAttribute('fill-opacity', value);
                }

            });

        },
        draw_d3_graphic: function(this_map, maps, data, element_id, width, height, scale_x, scale_y) {

            var a = data.extrema.min_x;

          	var b = data.extrema.max_y;

            var lineFunction = d3.svg.line()
                                     .x(function(d) { return scale_x * (-1*a + d[0]) })
                                     .y(function(d) { return scale_y * (b - d[1]) })
                                     .interpolate("linear");
                                     
            var canvas = d3.select(element_id).append("svg")
            .attr("width", width)
            .attr("height", height);

            var group = canvas.selectAll()
              .data(data.features)
              .enter()
              .append("path")
            
            var polygon_paths = new Array();

            var areas = group.attr("d",function(d) { 
                var l = lineFunction(d.coordinates);

                polygon_paths.push({id: d.properties.polygon_id, path: l})
                return l;

            }).attr("id", function(d){ return "path-" + this_map + "-" + d.properties.polygon_id; })
              .attr("class", function(d){ return "area" + " path-" + this_map + "-" + d.id;})
              .attr("fill", function(d) {return d.properties.color})
              .attr("stroke", "#000")
              .attr("stroke-width", "0.5")
              .on('mouseover', function(d, i) {
                             window.cartogram.highlight_by_id(maps, d.id, 0.6);
                             })
              .on('mouseout', function(d, i) {
                             window.cartogram.highlight_by_id(maps, d.id, 1);
                              });
            
            return polygon_paths;
        },
        get_generated_cartogram: function(areas_string, handler) {

            return new Promise(function(resolve, reject){

                var xhttp = new XMLHttpRequest();

                xhttp.onreadystatechange = function() {
                    if(this.readyState == 4)
                    {
                        if(this.status == 200)
                        {
                            try
                            {
                                resolve(JSON.parse(this.responseText));
                            }
                            catch(e)
                            {
                                console.log(e);
                                console.log(this.responseText);
                                reject('Input string does not have a proper JSON format.');
                            }
                        }
                        else
                        {
                            reject('Unable to fetch the cartogram from the server.');
                        }
                    }
                    
                };

                xhttp.open("POST", window.cartogram.cartogram_url, true);
                xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhttp.send(window.cartogram.serialize_post_variables({
                    handler: handler,
                    values: areas_string
                }));

            });

        },
        http_get: function(url) {

            return new Promise(function(resolve, reject){

                var xhttp = new XMLHttpRequest();

                xhttp.onreadystatechange = function() {
                    if(this.readyState == 4)
                    {
                        if(this.status == 200)
                        {
                            try
                            {
                                resolve(JSON.parse(this.responseText));
                            }
                            catch(e)
                            {
                                console.log(e);
                                console.log(this.responseText);
                                reject('Unable to parse output.');
                            }
                        }
                        else
                        {
                            console.log(url);
                            reject('Unable to fetch data from the server.');
                        }
                    }
                };

                xhttp.open("GET", url, true);
                xhttp.send();

            });

        },
        http_post: function(url, form_data) {

            return new Promise(function(resolve, reject){

                var xhttp = new XMLHttpRequest();

                xhttp.onreadystatechange = function() {
                    if(this.readyState == 4)
                    {
                        if(this.status == 200)
                        {
                            try
                            {
                                resolve(JSON.parse(this.responseText));
                            }
                            catch(e)
                            {
                                console.log(e);
                                console.log(this.responseText);
                                reject('Unable to parse output.');
                            }
                        }
                        else
                        {
                            console.log(url);
                            reject('Unable to fetch data from the server.');
                        }
                    }
                };

                xhttp.open("POST", url, true);
                xhttp.send(form_data);

            });

        },
        get_pregenerated_map: function(handler, map_name) {
            return this.http_get(this.cartogram_data_dir + "/" + handler + "/" + map_name + ".json");
        },
        get_default_colors: function(handler) {
            return this.http_get(this.cartogram_data_dir + "/" + handler + "/colors.json");
        },
        switch_displayed_map: function(map_name){

            if(this.in_loading_state)
                return;
            
            this.in_loading_state = true; // Lock the UI but don't display loading block
            
            if(this.map_alternates.map2_selected) //map2 to map3
            {
                this.map_alternates.map2.forEach(function(v, i){

                    var new_path = null;

                    window.cartogram.map_alternates.map3.forEach(function(w,j){

                        if(w.id == v.id)
                            new_path = w.path;

                    });

                    if(new_path != null)
                    {
                        d3.select('#path-' + map_name + '-' + v.id)
                        .attr('d', v.path)
                        .transition()
                        .ease(d3.easeBounce)
                        .duration(750)
                        .attr('d', new_path);
                    }

                });

                this.map_alternates.map2_selected = false;

                document.getElementById('map3-selector').classList.add('active');
                document.getElementById('map2-selector').classList.remove('active');

                document.getElementById('map3-selector').setAttribute('onclick', '');
                document.getElementById('map2-selector').setAttribute('onclick', "window.cartogram.switch_displayed_map('map2')");
            }
            else //map3 to map2
            {
                this.map_alternates.map3.forEach(function(v, i){

                    var new_path = null;

                    window.cartogram.map_alternates.map2.forEach(function(w,j){

                        if(w.id == v.id)
                            new_path = w.path;

                    });

                    if(new_path != null)
                    {
                        d3.select('#path-' + map_name + '-' + v.id)
                        .attr('d', v.path)
                        .transition()
                        .ease(d3.easeBounce)
                        .duration(1000)
                        .attr('d', new_path);
                    }

                });

                this.map_alternates.map2_selected = true;

                document.getElementById('map2-selector').classList.add('active');
                document.getElementById('map3-selector').classList.remove('active');

                document.getElementById('map2-selector').setAttribute('onclick', '');
                document.getElementById('map3-selector').setAttribute('onclick', "window.cartogram.switch_displayed_map('map2')");
            }

            this.in_loading_state = false;

        },
        draw_three_maps: function(map1, map2, map3, map1_container, map2_3_container, map2_name, map3_name){

            return new Promise(function(resolve, reject){

                Promise.all([map1, map2, map3]).then(function(values){

                /* Clean up the map containers */

                document.getElementById(map1_container).innerHTML = "";
                document.getElementById(map2_3_container).innerHTML = "";

                /* Now we fill the color information into each map */

                values.forEach(function(value, index){

                    values[index].features.forEach(function(v, i){

                        values[index].features[i].properties.color = window.cartogram.color_data['id_' + values[index].features[i].id];

                    });

                });

                var map_width = Math.max((values[0].extrema.max_x-values[0].extrema.min_x), (values[1].extrema.max_x-values[1].extrema.min_x), (values[2].extrema.max_x-values[2].extrema.min_x));
                var map_height = Math.max((values[0].extrema.max_y-values[0].extrema.min_y), (values[1].extrema.max_y-values[1].extrema.min_y), (values[2].extrema.max_y-values[2].extrema.min_y));

                /* Now we want to make sure that all three maps are displayed with equal area */

                values.forEach(function(value, index){

                    values[index].scale_x = map_width/(values[index].extrema.max_x-values[index].extrema.min_x);
                    values[index].scale_y = map_height/(values[index].extrema.max_y-values[index].extrema.min_y);

                });
                
                window.cartogram.draw_d3_graphic("map1", ['map1', 'map2'], values[0], "#" + map1_container, map_width, map_height, values[0].scale_x, values[0].scale_y);
                
                window.cartogram.map_alternates.map2 = window.cartogram.draw_d3_graphic("map2", ['map1', 'map2'], values[1], "#" + map2_3_container, map_width, map_height, values[1].scale_x, values[1].scale_y);

                var lineFunction = d3.svg.line()
                    .x(function(d) { return values[2].scale_x * (-1*(values[2].extrema.min_x) + d[0]) })
                    .y(function(d) { return values[2].scale_y * ((values[2].extrema.max_y) - d[1]) })
                    .interpolate("linear");

                window.cartogram.map_alternates.map3 = new Array();

                values[2].features.forEach(function(feature){

                    window.cartogram.map_alternates.map3.push({id: feature.properties.polygon_id, path: lineFunction(feature.coordinates)})

                });

                window.cartogram.map_alternates.map2_selected = true;

                document.getElementById('map1-switch').style.display = 'block';
                document.getElementById('map2-switch').style.display = 'block';

                document.getElementById('map2-selector').innerHTML = map2_name;
                document.getElementById('map3-selector').innerHTML = map3_name;

                document.getElementById('map2-selector').classList.add('active');
                document.getElementById('map3-selector').classList.remove('active');

                document.getElementById('map2-selector').setAttribute('onclick', '');
                document.getElementById('map3-selector').setAttribute('onclick', "window.cartogram.switch_displayed_map('map2')");
                
                resolve(values);

                },reject);

            });
            

        },
        draw_two_maps: function(map1, map2, map1_container, map2_container) {

            return new Promise(function(resolve, reject){

                Promise.all([map1, map2]).then(function(values){

                /* Clean up the map containers */

                document.getElementById(map1_container).innerHTML = "";
                document.getElementById(map2_container).innerHTML = "";

                document.getElementById('map1-switch').style.display = 'none';
                document.getElementById('map2-switch').style.display = 'none';

                /* Now we fill the color information into both maps */

                values.forEach(function(value, index){

                    values[index].features.forEach(function(v, i){

                        values[index].features[i].properties.color = window.cartogram.color_data['id_' + values[index].features[i].id];

                    });

                });

                /* Now we want to make sure that both maps are displayed with an equal area. */

                var map_width = Math.max((values[0].extrema.max_x-values[0].extrema.min_x), (values[1].extrema.max_x-values[1].extrema.min_x));
                var map_height = Math.max((values[0].extrema.max_y-values[0].extrema.min_y), (values[1].extrema.max_y-values[1].extrema.min_y));

                var scale_original_x = 1;
                var scale_original_y = 1;                
                var scale_cartogram_x = 1;
                var scale_cartogram_y = 1;

                if((values[0].extrema.max_x - values[0].extrema.min_x) > (values[1].extrema.max_x - values[1].extrema.min_x))
                {
                    /* The original map is wider than the cartogram */

                    scale_original_x = (values[0].extrema.max_x - values[0].extrema.min_x)/(values[1].extrema.max_x - values[1].extrema.min_x);
                }
                else
                {
                    /* The cartogram is wider than the original map */

                    scale_cartogram_x = (values[1].extrema.max_x - values[1].extrema.min_x)/(values[0].extrema.max_x - values[0].extrema.min_x);
                }

                if((values[0].extrema.max_y - values[0].extrema.min_y) > (values[1].extrema.max_y - values[1].extrema.min_y))
                {
                    /* The original map is taller than the cartogram */

                    scale_original_y = (values[0].extrema.max_y - values[0].extrema.min_y)/(values[1].extrema.max_y - values[1].extrema.min_y);
                }
                else
                {
                    /* The cartogram is taller than the original map */

                    scale_cartogram_y = (values[1].extrema.max_y - values[1].extrema.min_y)/(values[0].extrema.max_y - values[0].extrema.min_y);
                }

                console.log(map_width);
                console.log(map_height);

                console.log(scale_original_x);
                console.log(scale_original_y);

                console.log(scale_cartogram_x);
                console.log(scale_cartogram_y);



                window.cartogram.draw_d3_graphic("cartogram", ['cartogram', 'original'], values[0], "#" + map1_container, map_width, map_height, scale_cartogram_x, scale_cartogram_y);
                window.cartogram.draw_d3_graphic("original", ['cartogram', 'original'], values[1], "#" + map2_container, map_width, map_height, scale_original_x, scale_original_y);

                resolve(values);

            }, reject);

            });

        },
        request_and_draw_cartogram: function(){

            if(this.in_loading_state)
                return false;
            
            this.clear_nonfatal_error();

            /* Do some validation */

            if(document.getElementById('csv').files.length < 1)
            {
                this.do_nonfatal_error('You must upload CSV data.');
                return false;
            }

            this.enter_loading_state();
            
            var handler = document.getElementById('handler').value;

            var form_data = new FormData();

            form_data.append("handler", handler);
            form_data.append("csv", document.getElementById('csv').files[0]);
            
            this.http_post(this.cartogramui_url, form_data).then(function(response){

                if(response.error == "none")
                {
                    window.cartogram.color_data = response.color_data;

                    window.cartogram.draw_three_maps(window.cartogram.get_pregenerated_map(handler, "original"), window.cartogram.get_generated_cartogram(response.areas_string, handler), window.cartogram.get_pregenerated_map(handler, "population"), "map-area", "cartogram-area", "User Data", "Population").then(function(v){
                        
                        window.cartogram.exit_loading_state();
                        document.getElementById('cartogram').style.display = "flex"; //Bootstrap rows use flexbox

                    }, window.cartogram.do_fatal_error);
                }
                else
                {
                    window.cartogram.exit_loading_state();
                    document.getElementById('cartogram').style.display = "flex"; //Bootstrap rows use flexbox
                    window.cartogram.do_nonfatal_error(response.error);
                }

            }, this.do_fatal_error);

            return false; // We don't want to submit the form

        }

    };
}