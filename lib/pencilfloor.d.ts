
export interface Pencil
{
    x:      number;
    y:      number;
    color:  string;
}

export type PencilIterable = Iterable<Readonly<Pencil>>;

export type ArrangePencils =
(
    createParams:
    {
        minX:   number;
        maxX:   number;
        minY:   number;
        maxY:   number;
        width:  number;
        height: number;
    },
)
=>
PencilIterable;

declare const Pencilfloor:
{
    readonly DEFAULT_HEIGHT:        150;
    readonly DEFAULT_INSTANT_RATE:  0.5;
    readonly DEFAULT_PENCIL_SIZE:   5;
    readonly DEFAULT_QUICKNESS:     0.025;
    readonly DEFAULT_WIDTH:         300;
    readonly defaultArrangePencils: ArrangePencils;
    create
    (
        createParams?:
        {
            readonly width?:        number;
            readonly height?:       number;
            readonly pencilSize?:   number;
            readonly pencils?:      PencilIterable | ArrangePencils;
        },
    ):
    Pencilfloor;
};

interface Pencilfloor
{
    readonly height:        number;
    readonly instant:       number;
    instantRate:            number;
    interactive:            number;
    readonly paused:        boolean;
    readonly pencilSize:    number;
    readonly pencils:       Pencil[];
    quickness:              number;
    readonly width:         number;
    pause():                undefined;
    play():                 undefined;
}

export default Pencilfloor;
