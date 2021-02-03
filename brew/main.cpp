#include <cstdio>
#include <cstdint>
#include <cstring>
#include <SDL.h>
#include <SDL_image.h>

#define PATH_MAX 256

#define TILESIZE 32

#pragma pack(push,1)
struct RGB {
    uint8_t r, g, b;
};

struct MapHeader {
    char map_name[16];
    RGB ceiling_color, floor_color;
    uint16_t unknown1;
    RGB loading_screen_background;
    uint8_t map_id;
    RGB unknown2;
    uint16_t unknown3;
};

struct Linedef {
    uint8_t x1, y1, x2, y2;
    uint16_t texture, flags, unknown;
};
#pragma pack(pop)

template <typename T> T read_raw(FILE *f) {
    T val;
    fread(&val, sizeof(val), 1, f);
    return val;
}

int main(int argc, char **argv) {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        SDL_Log("Unable to initialize SDL: %s", SDL_GetError());
        return 1;
    }

    FILE *f = fopen("intro.bsp", "rb");

    MapHeader header {};
    fread(&header, 1, sizeof(header), f);

    uint16_t bsp_size = read_raw<uint16_t>(f);
//    printf("bsp size %d\n", bsp_size);
    fseek(f, bsp_size * 0xA, SEEK_CUR);

    uint16_t linedef_count = read_raw<uint16_t>(f);
//    printf("linedef count %d\n", linedef_count);
    auto *linedefs = new Linedef[linedef_count];
    fread(linedefs, 1, linedef_count * sizeof(Linedef), f);

    uint16_t thing_count = read_raw<uint16_t>(f);
//    printf("thing count %d\n", thing_count);
    fseek(f, thing_count * 0x5, SEEK_CUR);

    uint16_t event_count = read_raw<uint16_t>(f);
//    printf("event count %d\n", event_count);
    fseek(f, event_count * 0x4, SEEK_CUR);

    uint16_t script_count = read_raw<uint16_t>(f);
//    printf("script count %d\n", script_count);
    fseek(f, script_count * 0x9, SEEK_CUR);

    uint16_t string_count = read_raw<uint16_t>(f);
//    printf("string count %d\n", string_count);
    for(int i = 0; i < string_count; i++) {
        uint16_t string_length = read_raw<uint16_t>(f);
        char str[string_length + 1];
        memset(str, 0, string_length + 1);
        fread(str, 1, string_length, f);
//        printf("string %d: %s\n", i, str);
    }

    fseek(f, 256, SEEK_CUR); // skip blockmap

    uint8_t floor_textures[1024];
    fread(floor_textures, 1, 1024, f);
    uint8_t ceil_textures[1024];
    fread(ceil_textures, 1, 1024, f);

    SDL_Window *window = SDL_CreateWindow("Map Tile Viewer", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, TILESIZE * 32, TILESIZE * 32, SDL_WINDOW_SHOWN);
    SDL_Renderer *renderer = SDL_CreateRenderer(window, -1, 0);

    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY, "linear");

    SDL_Texture *textures[74];

    for(int i = 0; i < 74; i++) {
        char name[PATH_MAX];
        sprintf(name, "../../DRRP/textures/flats/drdc%d.png", i);
        SDL_Surface *surface = IMG_Load(name);
        textures[i] = SDL_CreateTextureFromSurface(renderer, surface);
        SDL_FreeSurface(surface);
    }

    uint8_t *cur_tex_arr = floor_textures;

    int q = 15;

    while(1) {
        SDL_Event e;
        if(SDL_PollEvent(&e)) {
            if(e.type == SDL_QUIT) {
                break;
            }
            if(e.type == SDL_MOUSEBUTTONDOWN) {
                int j = e.button.x / TILESIZE;
                int i = e.button.y / TILESIZE;
                if(i < 32 && j < 32) {
                    printf("%d\n", cur_tex_arr[i * 32 + j]);
                }
            }
            if(e.type == SDL_KEYDOWN) {
                if(e.key.keysym.sym == SDLK_f) {
                    cur_tex_arr = floor_textures;
                } else if(e.key.keysym.sym == SDLK_c) {
                    cur_tex_arr = ceil_textures;
                } else if(e.key.keysym.sym == SDLK_a) {
                    q += 1;
                    printf("%d\n", q);
                } else if(e.key.keysym.sym == SDLK_d) {
                    q -= 1;
                    printf("%d\n", q);
                }
            }
        }

        SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
        SDL_RenderClear(renderer);
        SDL_Rect dstRect;
        dstRect.w = TILESIZE;
        dstRect.h = TILESIZE;

        for(int i = 0; i < 32; i++) {
            for(int j = 0; j < 32; j++) {
                uint8_t tex_id = cur_tex_arr[i * 32 + j];
                dstRect.x = j * TILESIZE;
                dstRect.y = i * TILESIZE;
                int conv_tex_id = tex_id - 61;
                conv_tex_id -= 50;
                conv_tex_id %= q; // 15 or 30
                conv_tex_id += cur_tex_arr == ceil_textures ? 50 : 63;
                if(conv_tex_id >= 74) {
                    continue;
                }
                SDL_RenderCopy(renderer, textures[conv_tex_id], nullptr, &dstRect);
            }
        }

        SDL_SetRenderDrawColor(renderer, 0, 255, 255, 255);
        for(int i = 0; i < linedef_count; i++) {
            Linedef *line = &linedefs[i];
            SDL_RenderDrawLine(renderer, line->x1 * 2 * (TILESIZE / 16), line->y1 * 2 * (TILESIZE / 16), line->x2 * 2 * (TILESIZE / 16), line->y2 * 2 * (TILESIZE / 16));

        }

        SDL_RenderPresent(renderer);
    }

    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);

    SDL_Quit();

    return 0;
}
