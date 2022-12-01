use dep::std;

// TODO: Make more efficient
fn check_for_collision(lengths: [Field; 5], ships: [Field; 15]) {
    let mut has_collision = false;
    let mut ship_coords: [Field; 25] = [100; 25];
    for i in 0..5 {
        for j in 0..5 {
            if(!has_collision & (lengths[i] > j)) {
                let index = i * 5 + j;
                let coord = if ships[i*3+2] == 1 { 
                    ships[i*3] + ships[i*3+1] * 10 + (10 * j)
                } else {
                    ships[i*3] + ships[i*3+1] * 10 + j
                };
                has_collision = has_ship(coord, ship_coords);
                ship_coords[index] = coord;
            }
        };
    };
    constrain has_collision == false;
}

fn check_ship_ranges(length: Field, x: Field, y: Field, z: Field) {
        // Constrain z to binary (0 or 1)
        constrain (z as u4) <= 1;

        // Ensure bounds aren't exceeded in vertical or horizontal orientation
        if(z == 1) {
            constrain ((y + length) as u4) < 10 & (x as u4) < 10;
        } else {
            constrain ((x + length) as u4) < 10 & (y as u4) < 10;
        }
}

fn has_ship(coord: Field, ship_coords: [Field; 25]) -> bool {
    let mut occupied = false;
    for i in 0..25 {
        if(!occupied & (ship_coords[i] == coord)) {
            occupied = true;
        }
    };
    occupied
}

// _hash: pub Field
fn main(hash: pub Field, ships: [Field; 15]) {
    let _lengths: [Field; 5] = [5, 4, 3, 3, 2];
    
    // Check ship ranges
    for _i in 0..5 {
     check_ship_ranges(lengths[i], ships[i*3], ships[i*3+1], ships[i*3+2]);
    };
    check_for_collision(lengths, ships);

    // Check integrity of ship hash
    let computed_hash = std::hash::pedersen(ships);
    constrain hash == computed_hash[0];
}