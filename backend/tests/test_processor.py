from app.processor import ass_time, rank_windows


def test_ass_time_formats_centiseconds():
    assert ass_time(65.27) == "0:01:05.27"


def test_rank_windows_returns_distinct_candidates():
    segments = [
        {"start": 2.0, "end": 5.0, "text": "Here is an important idea about learning a new skill and avoiding a common mistake."},
        {"start": 5.0, "end": 9.0, "text": "The reason this works is because practice helps you understand the process much better."},
        {"start": 60.0, "end": 64.0, "text": "Why does this matter? It changes how people approach the problem and improve their results."},
        {"start": 64.0, "end": 68.0, "text": "This is the key lesson and something you should remember when you start again."},
    ]
    clips = rank_windows(segments, duration=120, count=2, max_seconds=30)
    assert len(clips) == 2
    assert clips[0]["start"] < clips[1]["start"]
