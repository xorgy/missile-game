
MG.BarrierType = {
    RANDOM: 'random',

    BARRIER_1: 1,
    BARRIER_2: 2,
    BARRIER_3: 3,
    BARRIER_4: 4,
    BARRIER_5: 5,
    BARRIER_6: 6,

    BLANK: 'blank',
    START: 'start',
    FINISH: 'finish'
};


MG.NUM_RANDOM_BARRIERS = 6;



/* TODO find nicer way of initalising MG.BARRIER_PATH_IDS */
MG.BARRIER_PATH_IDS = {}
MG.BARRIER_PATH_IDS[MG.BarrierType.RANDOM] = '';
MG.BARRIER_PATH_IDS[MG.BarrierType.BARRIER_1] = 'barrier-path-1';
MG.BARRIER_PATH_IDS[MG.BarrierType.BARRIER_2] = 'barrier-path-2';
MG.BARRIER_PATH_IDS[MG.BarrierType.BARRIER_3] = 'barrier-path-3';
MG.BARRIER_PATH_IDS[MG.BarrierType.BARRIER_4] = 'barrier-path-4';
MG.BARRIER_PATH_IDS[MG.BarrierType.BARRIER_5] = 'barrier-path-5';
MG.BARRIER_PATH_IDS[MG.BarrierType.BARRIER_6] = 'barrier-path-6';
MG.BARRIER_PATH_IDS[MG.BarrierType.BLANK] = 'barrier-path-blank';
MG.BARRIER_PATH_IDS[MG.BarrierType.START] = 'barrier-path-blank';
MG.BARRIER_PATH_IDS[MG.BarrierType.FINISH] = 'barrier-path-finish';

MG.BARRIER_COLLISION_FUNCTIONS = (function () {
    var epsilon = 0.01;

    function polar(p) {
        return [
            Math.sqrt(Math.pow(p[0], 2) + Math.pow(p[1], 2)),
            Math.atan2(p[1], p[0])
        ];
    }

    function dpoints(p1, p2) {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) +
                         Math.pow(p1[1] - p2[1], 2));
    }

    function dcenter(p) {
        return dpoints([0, 0], p);
    }

    function cc(f) {
        if(typeof f === 'function') {
            return function(x, y) {
                return (dcenter([x, y]) >= (80 - epsilon) || f(x, y));
            };
        } else {
            return null;
        }
    }

    return [
        null,
        function (x, y) {
            return (dcenter([x, y]) < 30 ||
                    (y < 0 && x > 0) ||
                    (y > 0 && x < 0));
        },
        function (x, y) {
            return [
                [50, 0],
                [-25, 43.300],
                [-25, -43.300]
            ].every(function(v) {
                return dpoints(v, [x, y]) > 30;
            });
        },
        function (x, y) {
            return (dcenter([x, y]) > 30 &&
                    (x < 0 || y < 0));
        },
        function (x, y) {
            var angle = polar([x, y])[1];
            return (dcenter([x, y]) < 30 ||
                    angle < 0 ||
                    angle > polar([-30.780, 84.570])[1]);
        },
        function (x, y) {
            return ((Math.abs(x) < 45) &&
                    (dpoints([81.92, 0], [Math.abs(x), y]) > 58));
        },
        function (x, y) {
            return (Math.abs(x) > 80 ||
                    Math.abs(y) > 25);
        },
        function (x, y) {
            return ;
        }
    ].map(cc);

    colliders.finish = cc(function(x, y) {
        var angle = polar([x, y])[1];
        return (dcenter([x, y]) > 75 &&
                ((y < 0 && angle < polar([53.030, 53.030])[1]) ||
                 (y > 0 && angle < polar([-53.030, -53.030])[1])));
    });

    return colliders;
})();

MG.Barrier = function (type) {
    if (type === undefined) {type = MG.BarrierType.RANDOM;}

    var mIsInitialised = false;

    var mTheta = 0.0;
    var mDTheta = 300.0*(0.5 - Math.random());

    var mIsRandom = (type === MG.BarrierType.RANDOM);
    var mType = (type === MG.BarrierType.RANDOM) ? Math.ceil(MG.NUM_RANDOM_BARRIERS*Math.random()) : type;

    var mRootNode;
    var mFrontPath;
    var mBackPath;

    this.init = function () {

        mRootNode = document.createElementNS(NAMESPACE_SVG, 'g');

        /* The path representing the face nearest the camera */
        mFrontPath = document.getElementById(MG.BARRIER_PATH_IDS[mType]).cloneNode(true);
        mFrontPath.setAttribute('class', 'barrier-path-front');

        /* The path partially obscured by the front path, added to give the illusion of thickness. */
        mBackPath = document.getElementById(MG.BARRIER_PATH_IDS[mType]).cloneNode(true);
        mBackPath.setAttribute('class', 'barrier-path-back');

        mRootNode.setAttribute('class', 'barrier');
        mRootNode.appendChild(mBackPath);
        mRootNode.appendChild(mFrontPath);

        mIsInitialised = true;
    };

    this.destroy = function () {
        mRootNode.parentNode.removeChild(mRootNode);
    };

    /**
     * Checks whether the point specified by x and y will collide with the barrier.
     * Works by counting the number of intersections between the path outlining the
     * barrier and a line between some point outside of the barrier, and the point
     * that is being tested.
     * Returns true if the point intersects the transformed barrier, false otherwise.
     */
    this.collides = function (x, y) {
        /* transform the provided coordinates to the coordinate system of the barrier */
        var x_ =    x * Math.cos(mTheta*Math.PI/180) + y * Math.sin(mTheta*Math.PI/180);
        var y_ = -x * Math.sin(mTheta*Math.PI/180) + y * Math.cos(mTheta*Math.PI/180);

        if(MG.BARRIER_COLLISION_FUNCTIONS[mType]) {
            return MG.BARRIER_COLLISION_FUNCTIONS[mType](x_, y_);
        } else {
            return false;
        }
    };


    this.update = function (dt) {
        mTheta += mDTheta * dt;
    };


    /**
     * Updates the barriers representation in the DOM to reflect changes made at
     * the last update.
     * `x` and `y` define the position of the viewpoint.
     * `offset` is the distance of the barrier from the viewpoint.
     */
    this.updateDOM = function (x, y, offset) {
        var frontScale = MG.PROJECTION_PLANE_DISTANCE / 
                (Math.tan(Math.PI * MG.FIELD_OF_VIEW/360.0)*(offset));

        var backScale    = MG.PROJECTION_PLANE_DISTANCE /
                (Math.tan(Math.PI * MG.FIELD_OF_VIEW/360.0)*(offset + 10));

        mFrontPath.setAttribute('transform',
                'scale(' + frontScale + ') translate(' + x    + ',' + y + ') rotate(' + mTheta + ')');
        mBackPath.setAttribute('transform',
                'scale(' + backScale + ') translate(' + x    + ',' + y + ') rotate(' + mTheta + ')');

        offset = Math.max(MG.LINE_OF_SIGHT - MG.BARRIER_SPACING ,Math.min(MG.LINE_OF_SIGHT,offset));
        var fog = 100 -100*(MG.LINE_OF_SIGHT - offset)/MG.BARRIER_SPACING;

        mFrontPath.setAttribute('fill',   'rgb('+(100+fog)+'%,'
                                                +(100+fog)+'%,'
                                                +(100+fog)+'%)');
        mBackPath.setAttribute('fill',    'rgb(' +(60+fog)+'%,'
                                                 +(60+fog)+'%,'
                                                 +(60+fog)+'%)');
        mFrontPath.setAttribute('stroke', 'rgb('  +(0+fog)+'%,'
                                                  +(0+fog)+'%,'
                                                  +(0+fog)+'%)');
        mBackPath.setAttribute('stroke',  'rgb('  +(0+fog)+'%,'
                                                  +(0+fog)+'%,'
                                                  +(0+fog)+'%)');
    };

    this.getType = function () {
        return mType;
    };

    this.isRandom = function () {
        return mIsRandom;
    };

    this.isInitialised = function () {
        return mIsInitialised;
    };

    this.getRootNode = function () {
        return mRootNode;
    };



};
