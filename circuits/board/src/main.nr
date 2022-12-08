use dep::std;

fn check_for_collision(lengths: [u4; 5], ships: [Field; 15]) {
    let mut collisions = 0;
    let mut ship_coords: [Field; 25] = [100; 25];
    for i in 0..5 {
        for j in 0..5 {
                if(lengths[i] > j as u4) {
                let mut coord = 0;
                let index = i * 5 + j;
                if ships[i*3+2] == 1 { 
                    coord = ships[i*3] + ships[i*3+1] * 10 + (10 * j);
                } else {
                    coord = ships[i*3] + ships[i*3+1] * 10 + j;
                }
                collisions = collisions + has_ship(coord, ship_coords);
                ship_coords[index] = coord;
            }
        };
    };
    constrain collisions == 0;
}

fn check_ship_ranges(length: u4, x: u4, y: u4, z: u4) {
        // Constrain z to binary (0 or 1)
        constrain z <= 1;

        // // Ensure bounds aren't exceeded in vertical or horizontal orientation
        if z == 1 {
            // TODO: Chain comparisons for cleaner code when Noir versions in sync
            constrain y + length < 10;
            constrain x < 10;
        } else {
            // TODO: Chain comparisons for cleaner code when Noir versions in sync
            constrain x + length < 10;
            constrain y < 10;
        }
}

fn has_ship(coord: Field, ship_coords: [Field; 25]) -> u32 {
    let mut collisions = 0;
    for i in 0..25 {
        collisions = collisions + (ship_coords[i] == coord) as u32;
    };
    collisions
}

fn main(hash: Field, ships: [Field; 15]) {
    let lengths: [u4; 5] = [5, 4, 3, 3, 2];
    // Check ship ranges
    for i in 0..5 {
     check_ship_ranges(lengths[i], ships[i*3] as u4, ships[i*3+1] as u4, ships[i*3+2] as u4);
    };
    check_for_collision(lengths, ships);
    // Check integrity of ship hash
    let computed_hash = std::hash::pedersen(ships);
    constrain hash == computed_hash[0];
}