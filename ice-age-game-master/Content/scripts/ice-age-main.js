window.IceAge = {
    Config: {
        OutcomeFadeInStart: 4
    },
    Attempts: 0,
    Outcomes: [
        { 
            id: 'FullGlacial',
            title: 'a Full Glacial!',
            html: '<strong>Congratulations!</strong><p>You achieved an ice age in {0}.</p>'
        },
        { 
            id: 'Stadial',
            title: 'a Stadial',
            html: '<p>Nearly there!! Significant cooling has occurred but it is not prolonged – think how you can adjust a parameter to push it over the edge</p>'
        },
        {
            id: 'Stadial-1',
            title: 'a Stadial',
            html: '<p>You have achieved cooling in the planet – but only a short-lived stadial rather than a full glacial - therefore at least 1 parameter needs a rethink</p>'
        },
        {
            id: 'InterStadial-1',
            title: 'an Interstadial',
            html: '<p>You are moving in the right direction but you still need to reduce the amount of heat received and think about how it is distributed around the planet – which parameters would be less efficient?</p>'
        },
        {
            id: 'InterStadial',
            title: 'an Interstadial',
            html: '<p>This means that the planet is receiving too much heat – so at least 1 of your parameters are wrong - You need to rethink your ideas regarding which conditions would produce the greatest cooling – then have another go</p>'
        },
        {
            id: 'InterGlacial-1',
            title: 'an Interglacial',
            html: '<p>This means that the planet is receiving too much heat – so at least 2 of your parameters are wrong - You need to rethink your ideas regarding which conditions would produce the greatest cooling – then have another go</p>'
        },
        {
            id: 'InterGlacial',
            title: 'an Interglacial',
            html: '<p>This means that the planet is receiving way too much heat – so all 3 of your parameters are wrong - You need to rethink your ideas regarding which conditions would produce the greatest cooling – then have another go</p>'
        }
    ],
    ResetValues: function () {
        window.IceAge.Values = undefined;

        $('#precession').slider("value", 0);
        $('#eccentricity').slider("value", 23);
        $('#obliquity').slider("value", 0.03);
    },
    CalculateEndResult: function() {
        var data = window.IceAge.DataPoints,
            vals = window.IceAge.Values;

        if (vals) {
            return data[vals.obliquity][vals.eccentricity][vals.precession];
        }

        return undefined;
    },
    Values: undefined,
    RunEndSequence: function ($endSlide, params) {
        var $content = $endSlide.find('#outcome-panel');
        var resultIndex = parseInt(window.IceAge.CalculateEndResult()) - 1;
        var sliderIndex = window.IceAge.Outcomes.length - resultIndex - 1;
        var outcome = window.IceAge.Outcomes[resultIndex]
        var $video = $endSlide.find('#outcome-video');
        $video.prop('src', 'Content/videos/outcomes/' + outcome.id + '.mov');

        window.IceAge.Attempts++;

        $content.hide();
        $content.find('#outcome-image').prop('src', './Content/images/outcomes/' + outcome.id + '.jpg');
        $content.find('#outcome-title').text(outcome.title);
        $content.find('#outcome-html').html(outcome.html.replace('{0}', window.IceAge.Attempts.toString() + (window.IceAge.Attempts > 1 ? ' attempts' : ' attempt')));
        $('#result-pointer').appendTo($content.find('#result-table tbody tr td').eq(sliderIndex));

        if (outcome.id == 'FullGlacial') {
            window.IceAge.Attempts = 0;
        }

        $video.on('ended', function () {
            $content.show();
        });

        $video.show();
        $video[0].play();

        $video.on('timeupdate', function updateTime () {
            var flagged = false;
            var seconds = IceAge.Config.OutcomeFadeInStart;

            var timerFunction = {}

            return function () {
                if (!flagged)
                {
                    if (this.currentTime > (this.duration - seconds)) {
                        this.removeEventListener("timeupdate", updateTime, false);
                        $content.fadeIn(seconds * 1000, function () {
                            $('.slides-navigation a').hide();

                            if (outcome.id == 'FullGlacial') {
                                $('.slides-navigation .new').show();
                            }
                            else {
                                $('.slides-navigation .re-try').show();
                            }
                        });

                        flagged = true;
                    }
                }
            }
        }());
    }
}