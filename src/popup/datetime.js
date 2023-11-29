(function () {
    'use strict';

    const isNum = v => !isNaN(v);

    const DEFAULT_FORMAT = "YYYY-MM-DDTHH:mm:ss.sss";
    const INVALID_DATE = "Invalid date";
    const REGEX_FORMAT = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|m{1,2}|s{1,3}/g;
    const REGEX_FORMAT_STRFTIME = /(%[a-z])/gi;
    const DEFAULT_FORMAT_STRFTIME = "%Y-%m-%dT%H:%M:%S.%Q%t";
    const DEFAULT_LOCALE = {
        months: "January February March April May June July August September October November December".split(" "),
        monthsShort: "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),
        weekdays: "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),
        weekdaysShort: "Sun Mon Tue Wed Thu Fri Sat".split(" "),
        weekdaysMin: "Su Mo Tu We Th Fr Sa".split(" "),
        weekStart: 0
    };

    const M = {
        ms: "Milliseconds",
        s: "Seconds",
        m: "Minutes",
        h: "Hours",
        D: "Date",
        d: "Day",
        M: "Month",
        Y: "FullYear",
        y: "Year",
        t: "Time"
    };

    const C = {
        ms: "ms",
        s: "second",
        m: "minute",
        h: "hour",
        D: "day",
        W: "week",
        d: "weekDay",
        M: "month",
        Y: "year",
        Y2: "year2",
        t: "time",
        c: "century",
        q: "quarter"
    };

    const required = (m = '') => {
        throw new Error("This argument is required!")
    };

    const isset = (v, nullable = true) => {
        try {
            return nullable ? typeof v !== 'undefined' : typeof v !== 'undefined' && v !== null
        } catch (e) {
            return false
        }
    };

    const not = v => typeof v === "undefined" || v === null;

    const lpad = function(str, pad, length){
        let _str = ""+str;
        if (length && _str.length >= length) {
            return _str;
        }
        return Array((length + 1) - _str.length).join(pad) + _str;
    };

    class Datetime {
        constructor() {
            const args = [].slice.call(arguments);
            this.value = new (Function.prototype.bind.apply(Date,  [this].concat(args) ) );
            this.locale = "en";
            this.weekStart = Datetime.locales["en"].weekStart;
            this.utcMode = false;
            this.mutable = true;

            if (!isNum(this.value.getTime())) {
                throw new Error(INVALID_DATE);
            }
        }

        static locales = {
            "en": DEFAULT_LOCALE
        }

        static isDatetime(val){
            return val instanceof Datetime;
        }

        static now(asDate = false){
            return datetime()[asDate ? "val" : "time"]();
        }

        static parse(str = required()){
            return datetime(Date.parse(str));
        }

        static setLocale(name = required(), locale = required()){
            Datetime.locales[name] = locale;
        }

        static getLocale(name = "en"){
            return isset(Datetime.locales[name], false) ? Datetime.locales[name] : Datetime.locales["en"];
        }

        static align(date, align){
            let _date = datetime(date),
                result, temp;

            switch (align) {
                case C.s:  result = _date.ms(0); break; //second
                case C.m:  result = Datetime.align(_date, C.s)[C.s](0); break; //minute
                case C.h:  result = Datetime.align(_date, C.m)[C.m](0); break; //hour
                case C.D:  result = Datetime.align(_date, C.h)[C.h](0); break; //day
                case C.M:  result = Datetime.align(_date, C.D)[C.D](1); break; //month
                case C.Y:  result = Datetime.align(_date, C.M)[C.M](0); break; //year
                case C.W:  {
                    temp = _date.weekDay();
                    result = Datetime.align(date, C.D).addDay(-temp);
                    break; // week
                }
                default: result = _date;
            }
            return result;
        }

        static alignEnd(date, align){
            let _date = datetime(date),
                result, temp;

            switch (align) {
                case C.ms: result = _date.ms(999); break; //second
                case C.s:  result = Datetime.alignEnd(_date, C.ms); break; //second
                case C.m:  result = Datetime.alignEnd(_date, C.s)[C.s](59); break; //minute
                case C.h:  result = Datetime.alignEnd(_date, C.m)[C.m](59); break; //hour
                case C.D:  result = Datetime.alignEnd(_date, C.h)[C.h](23); break; //day
                case C.M:  result = Datetime.alignEnd(_date, C.D)[C.D](1).add(1, C.M).add(-1, C.D); break; //month
                case C.Y:  result = Datetime.alignEnd(_date, C.D)[C.M](11)[C.D](31); break; //year
                case C.W:  {
                    temp = _date.weekDay();
                    result = Datetime.alignEnd(_date, 'day').addDay(6 - temp);
                    break; // week
                }

                default: result = date;
            }

            return result;
        }

        immutable(v){
            this.mutable = !(not(v) ? true : v);
            return this;
        }

        utc(){
            this.utcMode = true;
            return this;
        }

        local(){
            this.utcMode = false;
            return this;
        }

        useLocale(val, override){
            this.locale = override ? val : !isset(Datetime.locales[val], false) ? "en" : val;
            this.weekStart = Datetime.getLocale(this.locale).weekStart;
            return this;
        }

        clone(){
            const c = datetime(this.value);
            c.locale = this.locale;
            c.weekStart = this.weekStart;
            c.mutable = this.mutable;
            return c;
        }

        align(to){
            if (this.mutable) {
                this.value = Datetime.align(this, to).val();
                return this;
            }

            return this.clone().immutable(false).align(to).immutable(!this.mutable);
        }

        alignEnd(to){
            if (this.mutable) {
                this.value = Datetime.alignEnd(this, to).val();
                return this;
            }

            return this.clone().immutable(false).alignEnd(to).immutable(!this.mutable);
        }

        val(val){
            if ( !(val instanceof Date) )
                return this.value;

            if (this.mutable) {
                this.value = val;
                return this;
            }

            return datetime(val);
        }

        year2(){
            return +(""+this.year()).substr(-2);
        }

        /* Get + Set */

        _set(m, v){
            const fn = "set" + (this.utcMode && m !== "t" ? "UTC" : "") + M[m];
            if (this.mutable) {
                this.value[fn](v);
                return this;
            }
            const clone = this.clone();
            clone.value[fn](v);
            return clone;
        }

        _get(m){
            const fn = "get" + (this.utcMode && m !== "t" ? "UTC" : "") + M[m];
            return this.value[fn]();
        }

        _work(part, val){
            if (!arguments.length || (typeof val === "undefined" || val === null)) {
                return this._get(part);
            }
            return this._set(part, val);
        }

        ms(val){ return this._work("ms", val);}
        second(val){return this._work("s", val);}
        minute(val){return this._work("m", val); }
        hour(val){return this._work("h", val);}
        day(val){return this._work("D", val);}
        month(val){return this._work("M", val);}
        year(val){return this._work("Y", val);}
        time(val){return this._work("t", val);}

        weekDay(val){
            if (!arguments.length || (not(val))) {
                return this.utcMode ? this.value.getUTCDay() : this.value.getDay();
            }

            const curr = this.weekDay();
            const diff = val - curr;

            this.day(this.day() + diff);

            return this;
        }

        get(unit){
            return typeof this[unit] !== "function" ? this : this[unit]();
        }

        set(unit, val){
            return typeof this[unit] !== "function" ? this : this[unit](val);
        }

        add(val, to){
            switch (to) {
                case C.h: return this.time(this.time() + (val * 60 * 60 * 1000));
                case C.m: return this.time(this.time() + (val * 60 * 1000));
                case C.s: return this.time(this.time() + (val * 1000));
                case C.ms: return this.time(this.time() + (val));
                case C.D: return this.day(this.day() + val);
                case C.W: return this.day(this.day() + val * 7);
                case C.M: return this.month(this.month() + val);
                case C.Y: return this.year(this.year() + val);
            }
        }

        addHour(v){return this.add(v,C.h);}
        addMinute(v){return this.add(v,C.m);}
        addSecond(v){return this.add(v, C.s);}
        addMs(v){return this.add(v, C.ms);}
        addDay(v){return this.add(v,C.D);}
        addWeek(v){return this.add(v,C.W);}
        addMonth(v){return this.add(v, C.M);}
        addYear(v){return this.add(v, C.Y);}

        format(fmt, locale){
            const format = fmt || DEFAULT_FORMAT;
            const names = Datetime.getLocale(locale || this.locale);
            const year = this.year(), year2 = this.year2(), month = this.month(), day = this.day(), weekDay = this.weekDay();
            const hour = this.hour(), minute = this.minute(), second = this.second(), ms = this.ms();
            const matches = {
                YY: year2,
                YYYY: year,
                M: month + 1,
                MM: lpad(month + 1, 0, 2),
                MMM: names.monthsShort[month],
                MMMM: names.months[month],
                D: day,
                DD: lpad(day, 0, 2),
                d: weekDay,
                dd: names.weekdaysMin[weekDay],
                ddd: names.weekdaysShort[weekDay],
                dddd: names.weekdays[weekDay],
                H: hour,
                HH: lpad(hour, 0, 2),
                m: minute,
                mm: lpad(minute,0, 2),
                s: second,
                ss: lpad(second,0, 2),
                sss: lpad(ms,0, 3)
            };

            return format.replace(REGEX_FORMAT, (match, $1) => $1 || matches[match]);
        }

        valueOf(){
            return this.value.valueOf();
        }

        toString(){
            return this.value.toString();
        }
    }

    const datetime = (...args) => args && args[0] instanceof Datetime ? args[0] : new Datetime(...args);

    const fnFormat$5 = Datetime.prototype.format;

    const buddhistMixin = {
        buddhist() {
            return this.year() + 543;
        },

        format(format, locale) {
            format = format || DEFAULT_FORMAT;
            const matches = {
                BB: (this.buddhist() + "").slice(-2),
                BBBB: this.buddhist()
            };
            let result = format.replace(/(\[[^\]]+])|B{4}|B{2}/g, (match, $1) => $1 || matches[match]);

            return fnFormat$5.bind(this)(result, locale)
        }
    };

    Object.assign(Datetime.prototype, buddhistMixin);

    const createCalendar = (date, iso) => {
        let _date = date instanceof Datetime ? date.clone().align("month") : datetime(date);
        let ws = iso === 0 || iso ? iso : date.weekStart;
        let wd = ws ? _date.isoWeekDay() : _date.weekDay();
        let names = Datetime.getLocale(_date.locale);
        let now = datetime(), i;

        const getWeekDays = (wd, ws) => {
            if (ws === 0) {
                return wd;
            }
            let su = wd[0];
            return wd.slice(1).concat([su]);
        };

        const result = {
            month: names.months[_date.month()],
            days: [],
            weekstart: iso ? 1 : 0,
            weekdays: getWeekDays(names.weekdaysMin,ws),
            today: now.format("YYYY-MM-DD"),
            weekends: [],
            week: []
        };


        _date.addDay(ws ? -wd+1 : -wd);

        for(i = 0; i < 42; i++) {
            result.days.push(_date.format("YYYY-MM-DD"));
            _date.add(1, 'day');
        }

        result.weekends = result.days.filter(function(v, i){
            const def = [0,6,7,13,14,20,21,27,28,34,35,41];
            const iso = [5,6,12,13,19,20,26,27,33,34,40,41];

            return ws === 0 ? def.includes(i) : iso.includes(i);
        });

        _date = now.clone();
        wd = ws ? _date.isoWeekDay() : _date.weekDay();
        _date.addDay(ws ? -wd+1 : -wd);
        for (i = 0; i < 7; i++) {
            result.week.push(_date.format("YYYY-MM-DD"));
            _date.add(1, 'day');
        }

        return result;
    };

    Object.assign(Datetime.prototype, {
        // 1 - Monday, 0 - Sunday
        calendar(weekStart){
            return createCalendar(this, weekStart);
        }
    });

    const fnFormat$4 = Datetime.prototype.format;

    Object.assign(Datetime.prototype, {
        century(){
            return Math.ceil(this.year()/100);
        },

        format(format, locale){
            format = format || DEFAULT_FORMAT;

            const matches = {
                C: this.century()
            };

            let fmt = format.replace(/(\[[^\]]+])|C/g, (match, $1) => $1 || matches[match]);

            return fnFormat$4.bind(this)(fmt, locale)
        }
    });

    Object.assign(Datetime.prototype, {
        same(d){
            return this.time() === datetime(d).time();
        },

        /*
        * align: year, month, day, hour, minute, second, ms = default
        * */
        compare(d, align, operator = "="){
            const date = datetime(d);
            const curr = datetime(this.value);
            let t1, t2;

            operator = operator || "=";

            if (["<", ">", ">=", "<=", "=", "!="].includes(operator) === false) {
                operator = "=";
            }

            align = (align || "ms").toLowerCase();

            t1 = curr.align(align).time();
            t2 = date.align(align).time();

            switch (operator) {
                case "<":
                    return t1 < t2;
                case ">":
                    return t1 > t2;
                case "<=":
                    return t1 <= t2;
                case ">=":
                    return t1 >= t2;
                case "=":
                    return t1 === t2;
                case "!=":
                    return t1 !== t2;
            }
        },

        between(d1, d2){
            return this.younger(d1) && this.older(d2);
        },

        older(date, align){
            return this.compare(date, align, "<");
        },

        olderOrEqual(date, align){
            return this.compare(date, align, "<=");
        },

        younger(date, align){
            return this.compare(date, align, ">");
        },

        youngerOrEqual(date, align){
            return this.compare(date, align, ">=");
        },

        equal(date, align){
            return this.compare(date, align, "=");
        },

        notEqual(date, align){
            return this.compare(date, align, "!=");
        },

        diff(d){
            const date = datetime(d);
            const diff = Math.abs(this.time() - date.time());
            const diffMonth = Math.abs(this.month() - date.month() + (12 * (this.year() - date.year())));

            return {
                "ms": diff,
                "second": Math.ceil(diff / 1000),
                "minute": Math.ceil(diff / (1000 * 60)),
                "hour": Math.ceil(diff / (1000 * 60 * 60)),
                "day": Math.ceil(diff / (1000 * 60 * 60 * 24)),
                "month": diffMonth,
                "year": Math.floor(diffMonth / 12)
            }
        },

        distance(d, align){
            return this.diff(d)[align];
        }
    });

    Object.assign(Datetime.prototype, {
        isLeapYear(){
            const year = this.year();
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        }
    });

    Object.assign(Datetime.prototype, {
        dayOfYear(){
            const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
            const month = this.month();
            const day = this.day();
            return dayCount[month] + day + ((month > 1 && this.isLeapYear()) ? 1 : 0);
        }
    });

    Object.assign(Datetime.prototype, {
        daysInMonth(){
            const curr = datetime(this.value);
            return curr.add(1, 'month').day(1).add(-1, 'day').day();
        },

        daysInYear(){
            return this.isLeapYear() ? 366 : 365;
        },

        daysInYearMap(){
            const result = [];
            const curr = datetime(this.value);

            curr.month(0).day(1);

            for(let i = 0; i < 12; i++) {
                curr.add(1, 'month').add(-1, 'day');
                result.push(curr.day());
                curr.day(1).add(1, 'month');
            }
            return result;
        },

        daysInYearObj(locale, shortName){
            const map = this.daysInYearMap();
            const result = {};
            const names = Datetime.getLocale(locale || this.locale);

            map.forEach((v, i) => result[names[shortName ? 'monthsShort' : 'months'][i]] = v);

            return result;
        }
    });

    Object.assign(Datetime.prototype, {
        decade(){
            return Math.floor(this.year()/10) * 10;
        },

        decadeStart(){
            const decade = this.decade();
            const result = this.mutable ? this : this.clone();

            return result.year(decade).month(0).day(1);
        },

        decadeEnd(){
            const decade = this.decade() + 9;
            const result = this.mutable ? this : this.clone();

            return result.year(decade).month(11).day(31);
        },

        decadeOfMonth(){
            const part = this.clone().add(1, "month").day(1).add(-1, 'day').day() / 3;
            const day = this.day();

            if (day <= part) return 1;
            if (day <= part * 2) return 2;
            return 3;
        }
    });

    Object.assign(Datetime, {
        from(str, format, locale){
            let norm, normFormat, fItems, dItems;
            let iMonth, iDay, iYear, iHour, iMinute, iSecond, iMs;
            let year, month, day, hour, minute, second, ms;
            let parsedMonth;

            const getIndex = function(where, what){
                return where.map(function(el){
                    return el.toLowerCase();
                }).indexOf(what.toLowerCase());
            };

            const monthNameToNumber = function(month){
                let i = -1;
                const names = Datetime.getLocale(locale || 'en');

                if (not(month)) return -1;

                i = getIndex(names.months, month);

                if (i === -1 && typeof names["monthsParental"] !== "undefined") {
                    i = getIndex(names["monthsParental"], month);
                }

                if (i === -1) {
                    month = month.substr(0, 3);
                    i = getIndex(names.monthsShort, month);
                }

                return i === -1 ? -1 : i + 1;
            };

            const getPartIndex = function(part){
                const parts = {
                    "month": ["M", "mm", "%m"],
                    "day": ["D", "dd", "%d"],
                    "year": ["YY", "YYYY", "yy", "yyyy", "%y"],
                    "hour": ["h", "hh", "%h"],
                    "minute": ["m", "mi", "i", "ii", "%i"],
                    "second": ["s", "ss", "%s"],
                    "ms": ["sss"]
                };

                let result = -1, key, index;

                for(let i = 0; i < parts[part].length; i++) {
                    key = parts[part][i];
                    index = fItems.indexOf(key);
                    if (index !== -1) {
                        result = index;
                        break;
                    }
                }

                return result;
            };

            if (!format) {
                return datetime();
            }

            /* eslint-disable-next-line */
            norm = str.replace(/[\/,.:\s]/g, '-');
            /* eslint-disable-next-line */
            normFormat = format.toLowerCase().replace(/[^a-zA-Z0-9%]/g, '-');
            fItems = normFormat.split('-');
            dItems = norm.split('-');

            if (norm.replace(/-/g,"").trim() === "") {
                throw new Error(INVALID_DATE);
            }

            iMonth = getPartIndex("month");
            iDay = getPartIndex("day");
            iYear = getPartIndex("year");
            iHour = getPartIndex("hour");
            iMinute = getPartIndex("minute");
            iSecond = getPartIndex("second");
            iMs = getPartIndex("ms");

            if (iMonth > -1 && dItems[iMonth]) {
                if (isNaN(parseInt(dItems[iMonth]))) {
                    dItems[iMonth] = monthNameToNumber(dItems[iMonth]);
                    if (dItems[iMonth] === -1) {
                        iMonth = -1;
                    }
                } else {
                    parsedMonth = parseInt(dItems[iMonth]);
                    if (parsedMonth < 1 || parsedMonth > 12) {
                        iMonth = -1;
                    }
                }
            } else {
                iMonth = -1;
            }

            year  = iYear > -1 && dItems[iYear] ? dItems[iYear] : 0;
            month = iMonth > -1 && dItems[iMonth] ? dItems[iMonth] : 1;
            day   = iDay > -1 && dItems[iDay] ? dItems[iDay] : 1;

            hour    = iHour > -1 && dItems[iHour] ? dItems[iHour] : 0;
            minute  = iMinute > -1 && dItems[iMinute] ? dItems[iMinute] : 0;
            second  = iSecond > -1 && dItems[iSecond] ? dItems[iSecond] : 0;
            ms  = iMs > -1 && dItems[iMs] ? dItems[iMs] : 0;

            return datetime(year, month-1, day, hour, minute, second, ms);
        }
    });

    const fnFormat$3 = Datetime.prototype.format;

    Object.assign(Datetime.prototype, {
        ampm(isLowerCase){
            let val = this.hour() < 12 ? "AM" : "PM";
            return isLowerCase ? val.toLowerCase() : val;
        },

        hour12: function(h, p){
            let hour = h;

            if (arguments.length === 0) {
                return this.hour() % 12;
            }

            p = p || 'am';

            if (p.toLowerCase() === "pm") {
                hour += 12;
            }

            return this.hour(hour);
        },

        format: function(format, locale){
            let matches, result, h12 = this.hour12();

            format = format || DEFAULT_FORMAT;

            matches = {
                a: "["+this.ampm(true)+"]",
                A: "["+this.ampm(false)+"]",
                h: h12,
                hh: lpad(h12, 0, 2)
            };

            result = format.replace(/(\[[^\]]+])|a|A|h{1,2}/g, (match, $1) => $1 || matches[match]);

            return fnFormat$3.bind(this)(result, locale)
        }
    });

    const fnFormat$2 = Datetime.prototype.format;
    const fnAlign$1 = Datetime.align;
    const fnAlignEnd$1 = Datetime.alignEnd;

    Object.assign(Datetime, {
        align(d, align) {
            let date = datetime(d), result, temp;

            switch(align) {
                case "isoWeek":
                    temp = date.isoWeekDay();
                    result = fnAlign$1(date, 'day').addDay(-temp + 1);
                    break; // isoWeek

                default: result = fnAlign$1.apply(undefined, [date, align]);
            }

            return result;
        },

        alignEnd (d, align) {
            let date = datetime(d), result, temp;

            switch(align) {
                case "isoWeek":
                    temp = date.isoWeekDay();
                    result = fnAlignEnd$1(date, 'day').addDay(7 - temp);
                    break; // isoWeek

                default: result = fnAlignEnd$1.apply(undefined, [date, align]);
            }

            return result;
        }
    });

    Object.assign(Datetime.prototype, {
        isoWeekDay(val){
            let wd = (this.weekDay() + 6) % 7 + 1;

            if (!arguments.length || (not(val))) {
                return wd;
            }

            return this.addDay(val - wd);
        },

        format(format, locale){
            format = format || DEFAULT_FORMAT;
            const matches = {
                I: this.isoWeekDay()
            };
            let result = format.replace(/(\[[^\]]+])|I{1,2}/g, (match, $1) => $1 || matches[match]);
            return fnFormat$2.bind(this)(result, locale)
        }
    });

    Object.assign(Datetime, {
        max(){
            let arr = [].slice.call(arguments);
            return arr.map((el) => datetime(el)).sort((a, b) => b.time() - a.time())[0];
        }
    });

    Object.assign(Datetime.prototype, {
        max(){
            return Datetime.max.apply(this, [this].concat([].slice.call(arguments)));
        }
    });

    Object.assign(Datetime, {
        min(){
            let arr = [].slice.call(arguments);
            return arr.map((el) => datetime(el)).sort((a, b) => a.time() - b.time())[0];
        }
    });

    Object.assign(Datetime.prototype, {
        min(){
            return Datetime.min.apply(this, [this].concat([].slice.call(arguments)));
        }
    });

    const fnAlign = Datetime.align;
    const fnAlignEnd = Datetime.alignEnd;
    const fnAdd = Datetime.prototype.add;

    Object.assign(Datetime, {
        align(d, align){
            let date = datetime(d), result;

            switch(align) {
                case "quarter":  result = Datetime.align(date, 'day').day(1).month(date.quarter() * 3 - 3); break; //quarter
                default: result = fnAlign.apply(this, [date, align]);
            }

            return result;
        },

        alignEnd(d, align){
            let date = datetime(d), result;

            switch(align) {
                case "quarter":  result = Datetime.align(date, 'quarter').add(3, 'month').add(-1, 'ms'); break; //quarter
                default: result = fnAlignEnd.apply(this, [date, align]);
            }

            return result;
        }
    });

    Object.assign(Datetime.prototype, {
        quarter(){
            const month = this.month();

            if (month <= 2) return 1;
            if (month <= 5) return 2;
            if (month <= 8) return 3;
            return 4;
        },

        add(val, to){
            if (to === "quarter") {
                return this.month(this.month() + val * 3);
            }
            return fnAdd.bind(this)(val, to);
        },

        addQuarter(v){
            return this.add(v, "quarter");
        }
    });

    Object.assign(Datetime, {
        sort(arr, opt){
            let result, _arr;
            const o = {};

            if (typeof opt === "string" || typeof opt !== "object" || not(opt)) {
                o.format = DEFAULT_FORMAT;
                o.dir = opt && opt.toUpperCase() === "DESC" ? "DESC" : "ASC";
                o.returnAs = "datetime";
            } else {
                o.format = opt.format || DEFAULT_FORMAT;
                o.dir = (opt.dir || "ASC").toUpperCase();
                o.returnAs = opt.format ? "string" : opt.returnAs || "datetime";
            }

            _arr =  arr.map((el) => datetime(el)).sort((a, b) => a.valueOf() - b.valueOf());

            if (o.dir === "DESC") {
                _arr.reverse();
            }

            switch (o.returnAs) {
                case "string":
                    result = _arr.map((el) => el.format(o.format));
                    break;
                case "date":
                    result = _arr.map((el) => el.val());
                    break;

                default: result = _arr;
            }

            return result;
        }
    });

    const fnFormat$1 = Datetime.prototype.format;

    Object.assign(Datetime.prototype, {
        utcOffset(){
            return this.value.getTimezoneOffset();
        },

        timezone(){
            return this.toTimeString().replace(/.+GMT([+-])(\d{2})(\d{2}).+/, '$1$2:$3');
        },

        timezoneName(){
            return this.toTimeString().replace(/.+\((.+?)\)$/, '$1');
        },

        format(format, locale){
            format = format || DEFAULT_FORMAT;

            const matches = {
                Z: this.utcMode ? "Z" : this.timezone(),
                ZZ: this.timezone().replace(":", ""),
                ZZZ: "[GMT]"+this.timezone(),
                z: this.timezoneName()
            };

            let result = format.replace(/(\[[^\]]+])|Z{1,3}|z/g, (match, $1) => $1 || matches[match]);

            return fnFormat$1.bind(this)(result, locale)
        }
    });

    const fnFormat = Datetime.prototype.format;

    Object.assign(Datetime.prototype, {
        // TODO Need optimisation
        weekNumber (weekStart) {
            let nYear, nday, newYear, day, daynum, weeknum;

            weekStart = +weekStart || 0;
            newYear = datetime(this.year(), 0, 1);
            day = newYear.weekDay() - weekStart;
            day = (day >= 0 ? day : day + 7);
            daynum = Math.floor(
                (this.time() - newYear.time() - (this.utcOffset() - newYear.utcOffset()) * 60000) / 86400000
            ) + 1;

            if(day < 4) {
                weeknum = Math.floor((daynum + day - 1) / 7) + 1;
                if(weeknum > 52) {
                    nYear = datetime(this.year() + 1, 0, 1);
                    nday = nYear.weekDay() - weekStart;
                    nday = nday >= 0 ? nday : nday + 7;
                    weeknum = nday < 4 ? 1 : 53;
                }
            }
            else {
                weeknum = Math.floor((daynum + day - 1) / 7);
            }
            return weeknum;
        },

        isoWeekNumber(){
            return this.weekNumber(1);
        },

        weeksInYear(weekStart){
            const curr = datetime(this.value);
            return curr.month(11).day(31).weekNumber(weekStart);
        },

        format: function(format, locale){
            let matches, result, wn = this.weekNumber(), wni = this.isoWeekNumber();

            format = format || DEFAULT_FORMAT;

            matches = {
                W: wn,
                WW: lpad(wn, 0, 2),
                WWW: wni,
                WWWW: lpad(wni, 0, 2)
            };

            result = format.replace(/(\[[^\]]+])|W{1,4}/g, (match, $1) => $1 || matches[match]);

            return fnFormat.bind(this)(result, locale)
        }
    });

    Object.assign(Datetime.prototype, {
        strftime(fmt, locale){
            const format = fmt || DEFAULT_FORMAT_STRFTIME;
            const names = Datetime.getLocale(locale || this.locale);
            const year = this.year(), year2 = this.year2(), month = this.month(), day = this.day(), weekDay = this.weekDay();
            const hour = this.hour(), hour12 = this.hour12(), minute = this.minute(), second = this.second(), ms = this.ms(), time = this.time();
            const aDay = lpad(day, 0, 2),
                aMonth = lpad(month + 1, 0, 2),
                aHour = lpad(hour, 0, 2),
                aHour12 = lpad(hour12, 0, 2),
                aMinute = lpad(minute, 0, 2),
                aSecond = lpad(second, 0, 2),
                aMs = lpad(ms, 0, 3);

            const that = this;

            const thursday = function(){
                return datetime(that.value).day(that.day() - ((that.weekDay() + 6) % 7) + 3);
            };

            const matches = {
                '%a': names.weekdaysShort[weekDay],
                '%A': names.weekdays[weekDay],
                '%b': names.monthsShort[month],
                '%h': names.monthsShort[month],
                '%B': names.months[month],
                '%c': this.toString().substring(0, this.toString().indexOf(" (")),
                '%C': this.century(),
                '%d': aDay,
                '%D': [aDay, aMonth, year].join("/"),
                '%e': day,
                '%F': [year, aMonth, aDay].join("-"),
                '%G': thursday().year(),
                '%g': (""+thursday().year()).slice(2),
                '%H': aHour,
                '%I': aHour12,
                '%j': lpad(this.dayOfYear(), 0, 3),
                '%k': aHour,
                '%l': aHour12,
                '%m': aMonth,
                '%n': month + 1,
                '%M': aMinute,
                '%p': this.ampm(),
                '%P': this.ampm(true),
                '%s': Math.round(time / 1000),
                '%S': aSecond,
                '%u': this.isoWeekDay(),
                '%V': this.isoWeekNumber(),
                '%w': weekDay,
                '%x': this.toLocaleDateString(),
                '%X': this.toLocaleTimeString(),
                '%y': year2,
                '%Y': year,
                '%z': this.timezone().replace(":", ""),
                '%Z': this.timezoneName(),
                '%r': [aHour12, aMinute, aSecond].join(":") + " " + this.ampm(),
                '%R': [aHour, aMinute].join(":"),
                "%T": [aHour, aMinute, aSecond].join(":"),
                "%Q": aMs,
                "%q": ms,
                "%t": this.timezone()
            };

            return format.replace(
                REGEX_FORMAT_STRFTIME,
                (match) => (matches[match] === 0 || matches[match] ? matches[match] : match)
            );
        }
    });

    Object.assign(Datetime, {
        isToday(date){
            const d = datetime(date).align("day");
            const c = datetime().align('day');

            return d.time() === c.time();
        }
    });

    Object.assign(Datetime.prototype, {
        isToday(){
            return Datetime.isToday(this);
        },

        today(){
            const now = datetime();

            if (!this.mutable) {
                return now;
            }
            return this.val(now.val());
        }
    });

    Object.assign(Datetime, {
        isTomorrow(date){
            const d = datetime(date).align("day");
            const c = datetime().align('day').add(1, 'day');

            return d.time() === c.time();
        }
    });

    Object.assign(Datetime.prototype, {
        isTomorrow(){
            return Datetime.isTomorrow(this);
        },

        tomorrow(){
            if (!this.mutable) {
                return this.clone().immutable(false).add(1, 'day').immutable(!this.mutable);
            }
            return this.add(1, 'day');
        }
    });

    Object.assign(Datetime.prototype, {
        toDateString(){
            return this.value.toDateString();
        },

        toISOString(){
            return this.value.toISOString();
        },

        toJSON(){
            return this.value.toJSON();
        },

        toGMTString(){
            return this.value.toGMTString();
        },

        toLocaleDateString(){
            return this.value.toLocaleDateString();
        },

        toLocaleString(){
            return this.value.toLocaleString();
        },

        toLocaleTimeString(){
            return this.value.toLocaleTimeString();
        },

        toTimeString(){
            return this.value.toTimeString();
        },

        toUTCString(){
            return this.value.toUTCString();
        },

        toDate(){
            return new Date(this.value);
        }
    });

    Object.assign(Datetime, {
        timestamp(){
            return new Date().getTime() / 1000;
        }
    });

    Object.assign(Datetime.prototype, {
        unix(val) {
            let _val;

            if (!arguments.length || (not(val))) {
                return Math.floor(this.valueOf() / 1000)
            }

            _val = val * 1000;

            if (this.mutable) {
                return this.time(_val);
            }

            return datetime(this.value).time(_val);
        },

        timestamp(){
            return this.unix();
        }
    });

    Object.assign(Datetime, {
        isYesterday(date){
            const d = datetime(date).align("day");
            const c = datetime().align('day').add(-1, 'day');

            return d.time() === c.time();
        }
    });

    Object.assign(Datetime.prototype, {
        isYesterday(){
            return Datetime.isYesterday(this);
        },

        yesterday(){
            if (!this.mutable) {
                return this.clone().immutable(false).add(-1, 'day').immutable(!this.mutable);
            }
            return this.add(-1, 'day');
        }
    });

    const getResult = (val) => {
        let res;
        let seconds = Math.floor(val / 1000),
            minutes = Math.floor(seconds / 60),
            hours = Math.floor(minutes / 60),
            days = Math.floor(hours / 24),
            months = Math.floor(days / 30),
            years = Math.floor(months / 12);

        if (years >= 1) res =  `${years} year`;
        if (months >= 1 && years < 1) res =  `${months} mon`;
        if (days >= 1 && days <= 30) res =  `${days} days`;
        if (hours && hours < 24) res =  `${hours} hour`;
        if (minutes && (minutes >= 40 && minutes < 60)) res =  "less a hour";
        if (minutes && minutes < 40) res =  `${minutes} min`;
        if (seconds && seconds >= 30 && seconds < 60) res =  `${seconds} sec`;
        if (seconds < 30) res =  `few sec`;

        return res
    };

    Object.assign(Datetime, {
        timeLapse(d) {
            let old = datetime(d),
                now = datetime(),
                val = now - old;

            return getResult(val)
        }
    });

    Object.assign(Datetime.prototype, {
        timeLapse() {
            let val = datetime() - +this;
            return getResult(val)
        }
    });

    const ParseTimeMixin = {
        parseTime (t) {
            if (!isNaN(t)) return Math.abs(+t)
            const pattern = /([0-9]+d)|([0-9]{1,2}h)|([0-9]{1,2}m)|([0-9]{1,2}s)/gm;
            const match = t.match(pattern);
            return match.reduce( (acc, val) => {
                let res;

                if (val.includes('d')) {
                    res = 1000 * 60 * 60 * 24 * parseInt(val);
                } else if (val.includes('h')) {
                    res = 1000 * 60 * 60 * parseInt(val);
                } else if (val.includes('m')) {
                    res = 1000 * 60 * parseInt(val);
                } else if (val.includes('s')) {
                    res = 1000 * parseInt(val);
                }

                return acc + res
            }, 0 )
        }
    };

    Object.assign(Datetime, ParseTimeMixin);

    globalThis.Datetime = Datetime;
    globalThis.datetime = datetime;
    if (!globalThis.date) {
        globalThis.date = datetime;
    }

})();