import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "http://127.0.0.1:3210";

// Hardcoded state from game-slot.tsx (lines 151-221)
// We use this because workflow_output.json has an empty initialState.
const INITIAL_STATE = {
    meta: {
        turn: 'white',
        selectedPieceId: 'pawn_white_01',
        check: { kingId: 'king_black_01', color: 'black' },
        validMoves: [
            { x: 0, y: 2 },
            { x: 0, y: 3 }
        ],
    },
    zones: {
        board: {
            id: 'board',
            type: 'grid',
            width: 8,
            height: 8,
            entities: []
        },
        captured_white: { id: 'captured_white', type: 'list', entities: [] },
        captured_black: { id: 'captured_black', type: 'list', entities: [] },
    },
    entities: {
        'pawn_white_01': { id: 'pawn_white_01', t: 'pawn_white', pos: { x: 0, y: 1 } },
        'pawn_white_02': { id: 'pawn_white_02', t: 'pawn_white', pos: { x: 1, y: 1 } },
        'pawn_white_03': { id: 'pawn_white_03', t: 'pawn_white', pos: { x: 2, y: 1 } },
        'pawn_white_04': { id: 'pawn_white_04', t: 'pawn_white', pos: { x: 3, y: 1 } },
        'pawn_white_05': { id: 'pawn_white_05', t: 'pawn_white', pos: { x: 4, y: 1 } },
        'pawn_white_06': { id: 'pawn_white_06', t: 'pawn_white', pos: { x: 5, y: 1 } },
        'pawn_white_07': { id: 'pawn_white_07', t: 'pawn_white', pos: { x: 6, y: 1 } },
        'pawn_white_08': { id: 'pawn_white_08', t: 'pawn_white', pos: { x: 7, y: 1 } },
        'rook_white_01': { id: 'rook_white_01', t: 'rook_white', pos: { x: 0, y: 0 } },
        'rook_white_02': { id: 'rook_white_02', t: 'rook_white', pos: { x: 7, y: 0 } },
        'knight_white_01': { id: 'knight_white_01', t: 'knight_white', pos: { x: 1, y: 0 } },
        'knight_white_02': { id: 'knight_white_02', t: 'knight_white', pos: { x: 6, y: 0 } },
        'bishop_white_01': { id: 'bishop_white_01', t: 'bishop_white', pos: { x: 2, y: 0 } },
        'bishop_white_02': { id: 'bishop_white_02', t: 'bishop_white', pos: { x: 5, y: 0 } },
        'queen_white_01': { id: 'queen_white_01', t: 'queen_white', pos: { x: 3, y: 0 } },
        'king_white_01': { id: 'king_white_01', t: 'king_white', pos: { x: 4, y: 0 } },
        'pawn_black_01': { id: 'pawn_black_01', t: 'pawn_black', pos: { x: 0, y: 6 } },
        'pawn_black_02': { id: 'pawn_black_02', t: 'pawn_black', pos: { x: 1, y: 6 } },
        'pawn_black_03': { id: 'pawn_black_03', t: 'pawn_black', pos: { x: 2, y: 6 } },
        'pawn_black_04': { id: 'pawn_black_04', t: 'pawn_black', pos: { x: 3, y: 6 } },
        'pawn_black_05': { id: 'pawn_black_05', t: 'pawn_black', pos: { x: 4, y: 6 } },
        'pawn_black_06': { id: 'pawn_black_06', t: 'pawn_black', pos: { x: 5, y: 6 } },
        'pawn_black_07': { id: 'pawn_black_07', t: 'pawn_black', pos: { x: 6, y: 6 } },
        'pawn_black_08': { id: 'pawn_black_08', t: 'pawn_black', pos: { x: 7, y: 6 } },
        'rook_black_01': { id: 'rook_black_01', t: 'rook_black', pos: { x: 0, y: 7 } },
        'rook_black_02': { id: 'rook_black_02', t: 'rook_black', pos: { x: 7, y: 7 } },
        'knight_black_01': { id: 'knight_black_01', t: 'knight_black', pos: { x: 1, y: 7 } },
        'knight_black_02': { id: 'knight_black_02', t: 'knight_black', pos: { x: 6, y: 7 } },
        'bishop_black_01': { id: 'bishop_black_01', t: 'bishop_black', pos: { x: 2, y: 7 } },
        'bishop_black_02': { id: 'bishop_black_02', t: 'bishop_black', pos: { x: 5, y: 7 } },
        'queen_black_01': { id: 'queen_black_01', t: 'queen_black', pos: { x: 3, y: 7 } },
        'king_black_01': { id: 'king_black_01', t: 'king_black', pos: { x: 4, y: 7 }, inCheck: true },
    }
};

const RULES = `
  Chess is a two-player strategy board game played on a checkered board with 64 squares arranged in an 8x8 grid.
  Each player begins with 16 pieces: one king, one queen, two rooks, two knights, two bishops, and eight pawns.
  The objective is to checkmate the opponent's king by placing it under an inescapable threat of capture.
`;

async function seed() {
    console.log(`Connecting to Convex at ${CONVEX_URL}...`);
    const client = new ConvexHttpClient(CONVEX_URL);

    console.log("Seeding database with hardcoded INITIAL_STATE...");
    try {
        await client.mutation("games:reset", {
            initialState: INITIAL_STATE,
            rules: RULES
        });
        console.log("Database seeded successfully!");
    } catch (e) {
        console.error("Failed to seed database:", e);
        process.exit(1);
    }
}

seed();
