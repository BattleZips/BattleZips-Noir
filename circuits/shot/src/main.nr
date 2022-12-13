use dep::std;

//
//  Checks whether a shot is taken at a coordinate that contains a ship
//
//  Input:
//      lengths { [u4; 5] } - An array containing the length of every ship
//      ships { [Field; 15] } - Array that represents x and y coordinate of ships followed by orientation (horizontal / vertical)
//      shot { [Field; 2] } - Array containing the x and y coordinate of a shot
//
//  Return - A boolean value of whether or not a shot has hit a coordinate occupied by a ship
//
fn check_for_hit(lengths: [u4; 5], ships: [Field; 15], shot: [Field; 2]) -> bool {
    let shot_coord = shot[0] + shot[1] * 10;
    let mut hits = 0;
    for i in 0..5 {
        for j in 0..5 {
            if(lengths[i] > j as u4) {
                let mut coord = 0;
                if ships[i*3+2] == 1 { 
                    coord = ships[i*3] + ships[i*3+1] * 10 + (10 * j);
                } else {
                    coord = ships[i*3] + ships[i*3+1] * 10 + j;
                }
                hits = hits + (coord == shot_coord) as u1;
            }
        };
    };
    hits > 0
}

//
//  Circuit to determine shot validity and whether it was a hit or not
//
//  Input:
//      hash { pub Field } - Hash computed outside circuit representing current board state
//      hit { u1 } - Report on whether or not shot is a hit
//      ships { [Field: 15] } - Array that represents x and y coordinate of ships followed by orientation (horizontal / vertical) 
//
fn main(hash: pub Field, hit: pub u1, ships: [Field; 15], shot: pub [Field; 2]) {
    // Lengths of all ships
   let lengths: [u4; 5] = [5, 4, 3, 3, 2];
   // Ensure shots within board boundaries
   constrain shot[0] as u4 < 10;
   constrain shot[1] as u4 < 10;

   // Ensure computed hash is equal to provided hash
   let computed_hash = std::hash::pedersen(ships);
   constrain hash == computed_hash[0];

    // Check whether shot coordinate is a hit or not and then contrain against hit declaration
   let hits = check_for_hit(lengths, ships, shot);
   constrain hits as u1 == hit;
}