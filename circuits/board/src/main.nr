use dep::std;

//
//  Helper function to ensure ships do not share coordinates
//
//  Input:
//      lengths { [u4; 5] } - Lengths of each ship
//      ships { [Field; 15] } - Array that represents x and y coordinate of ships followed by orientation (horizontal / vertical)
//
fn check_for_collision(lengths: [u4; 5], ships: [Field; 15]) {
    let mut collisions = 0;
    // Array is initialized to length 25 because array indices in Noir are currently restricted
    // to comptime values. Length 25 ensures index never exceeds array bounds (index max (i * 5 + j) is 24)
    let mut ship_coords: [Field; 25] = [100; 25];
    for i in 0..5 {
        //
        //  Inner loop will eventually have range determined by ship length (0..lengths[i]).
        //  For now non comptime indexes are not supported in ranges. Set to 5 since maximum
        //  ship length is 5
        //
        for j in 0..5 {
                // Prevent array from being mutated if inner loop index exceeds current ship length
                if(lengths[i] > j as u4) {
                let mut coord = 0;
                let index = i * 5 + j;
                // If ship is oriented vertically then calculate coordinate accordingly. Same for horizontal
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

//
//  Helper function to ensure all ships are within the bounds of the board
//
//  Input:
//      length { u4 } - Length of current ship
//       x { u4 } - x-coord of ship
//       y { u4 } - y-coord of ship
//       z { u4 } - Orientation of ship (horizontal / vertical)
//
fn check_ship_ranges(length: u4, x: u4, y: u4, z: u4) {
        // Constrain z to binary (0 or 1)
        constrain z <= 1;

        // Ensure bounds aren't exceeded in vertical or horizontal orientation
        if z == 1 {
            constrain y + length < 10;
            constrain x < 10;
        } else {
            constrain x + length < 10;
            constrain y < 10;
        }
}

//
//  Checks to see if a given coordinate contains a ship
//
//  Input:
//      coord { Field } - Current coordinate being checked for ship
//      ship_coords { [Field; 25] } - Array of ship coordinates that will be looped through and compared
//                                    to the current coordinate
//  Return - The number of collisions detected
//
fn has_ship(coord: Field, ship_coords: [Field; 25]) -> u32 {
    let mut collisions = 0;
    for i in 0..25 {
        collisions = collisions + (ship_coords[i] == coord) as u32;
    };
    collisions
}

//
//  Circuit that determines board validity for a Battleship Game
//
//  Input:
//      hash { pub Field } - Pedersen hash computed outside of circuit that represents board state
//      ships { [Field: 15] } - Array that represents ship coordinates
//
fn main(hash: pub Field, ships: [Field; 15]) {
    // Lengths of all ships
    let lengths: [u4; 5] = [5, 4, 3, 3, 2];
    // Check ship ranges
    for i in 0..5 {
     check_ship_ranges(lengths[i], ships[i*3] as u4, ships[i*3+1] as u4, ships[i*3+2] as u4);
    };
    // Ensure ships have valid placement and do not share coordinates with each other
    check_for_collision(lengths, ships);
    // Check integrity of ship hash
    let computed_hash = std::hash::pedersen(ships);
    constrain hash == computed_hash[0];
}