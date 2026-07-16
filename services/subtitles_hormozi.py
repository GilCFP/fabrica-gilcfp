"""Gerador de legendas estilo Hormozi no formato ASS.

Estilo:
- Fonte grande, negrito, branca com contorno preto grosso.
- Palavras-chave destacadas em amarelo (#FFD700).
- Posicionamento central inferior, adequado para 9:16 (1080x1920).
- Frases curtas (máx. 4 palavras / ~3.5s) para reter atenção.

O ASS é renderizado pelo FFmpeg via filtro `ass=` ou `subtitles=`.
"""
import os
import re
from typing import Dict, List, Tuple

# Configuração visual padrão do estilo Hormozi.
HORMOZI_STYLE = {
    "fontname": "Arial",
    "fontsize": 92,
    "primary_colour": "&HFFFFFF&",      # branco
    "secondary_colour": "&H000000&",    # preto (não usado, evita artefatos no contorno)
    "outline_colour": "&H000000&",      # preto
    "back_colour": "&H000000&",         # preto (sombra)
    "bold": 1,
    "italic": 0,
    "underline": 0,
    "strike_out": 0,
    "scale_x": 105,
    "scale_y": 105,
    "spacing": 0,
    "angle": 0,
    "border_style": 1,
    "outline": 2,
    "shadow": 2,
    "alignment": 2,          # centro-inferior
    "margin_l": 80,
    "margin_r": 80,
    "margin_v": 220,         # distância da base (evita cortes)
    "encoding": 1,
}

# Cores inline ASS: &HAA BB GG RR&, onde AA=00 é opaco.
PRIMARY_WHITE = "&H00FFFFFF&"       # branco
EMPHASIS_YELLOW = "&H0000FFFF&"     # amarelo vibrante
EMPHASIS_ORANGE = "&H0000A5FF&"     # laranja (alternativa)

# Stopwords em português — palavras que normalmente não merecem destaque.
STOPWORDS_PT = {
    "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "é", "com",
    "não", "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como",
    "mas", "foi", "ao", "ele", "das", "tem", "à", "seu", "sua", "ou", "ser",
    "quando", "muito", "há", "nos", "já", "está", "eu", "também", "só", "pelo",
    "pela", "até", "isso", "ela", "entre", "era", "depois", "sem", "mesmo", "aos",
    "ter", "todos", "cada", "faz", "foram", "essa", "esses", "este", "esta", "estes",
    "estas", "aquele", "aquela", "aqueles", "aquelas", "qual", "quais", "quem", "cujo",
    "cuja", "cujos", "cujas", "onde", "aí", "aqui", "ali", "assim", "então", "porque",
    "porquê", "porquanto", "logo", "pois", "que", "qual", "quanto", "tão", "muito",
    "pouco", "mais", "menos", "bem", "mal", "tudo", "nada", "algo", "alguém", "ninguém",
    "outro", "outra", "outros", "outras", "mesmo", "mesma", "próprio", "própria",
    "tal", "tais", "qualquer", "quaisquer", "todo", "toda", "todos", "todas", "só",
    "somente", "apenas", "justamente", "exatamente", "precisamente", "literalmente",
}


def _ass_time(seconds: float) -> str:
    """Converte segundos para formato ASS H:MM:SS.cc"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds % 1) * 100))
    if centis >= 100:
        centis = 99
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def _clean_word(word: str) -> str:
    """Remove espaços e quebras de linha internas."""
    return word.replace("\n", " ").replace("\r", "").strip()


def group_words_into_clips(
    words: List[Dict],
    max_words: int = 4,
    max_duration: float = 3.5,
    pause_threshold: float = 0.4,
) -> List[Dict]:
    """Agrupa palavras do Whisper em clips curtos para legendas."""
    clips = []
    current = []

    for w in words:
        word_text = _clean_word(w.get("word", ""))
        if not word_text:
            continue

        # Se a pausa antes desta palavra for grande, fecha o clip anterior.
        if current:
            gap = w.get("start", 0) - current[-1].get("end", current[-1].get("start", 0))
            if gap > pause_threshold:
                clips.append({
                    "start": current[0].get("start", 0),
                    "end": current[-1].get("end", current[-1].get("start", 0)),
                    "words": current,
                })
                current = []

        current.append({
            "word": word_text,
            "start": w.get("start", 0),
            "end": w.get("end", w.get("start", 0)),
        })

        duration = current[-1]["end"] - current[0]["start"]
        if len(current) >= max_words or duration >= max_duration:
            clips.append({
                "start": current[0]["start"],
                "end": current[-1]["end"],
                "words": current,
            })
            current = []

    if current:
        clips.append({
            "start": current[0]["start"],
            "end": current[-1]["end"],
            "words": current,
        })

    return clips


def _is_emphasis_word(word: str) -> bool:
    """Heurística simples para palavras que merecem destaque."""
    clean = re.sub(r"[^a-zA-Z0-9áéíóúàèìòùâêîôûãõçñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇÑ]", "", word).lower()
    if not clean:
        return False
    if clean in STOPWORDS_PT:
        return False
    # Números ou palavras longas (> 5 letras) ou palavras que começam com maiúscula.
    if word[0].isupper():
        return True
    if len(clean) >= 5:
        return True
    if re.search(r"\d", word):
        return True
    return False


def _pick_emphasis_words(clip_words: List[Dict], max_emphasis: int = 2) -> List[int]:
    """Retorna índices das palavras a serem destacadas no clip."""
    candidates = [i for i, w in enumerate(clip_words) if _is_emphasis_word(w["word"])]
    # Limita para não poluir; prioriza as primeiras palavras-chave encontradas.
    return candidates[:max_emphasis]


def _format_ass_line(clip_words: List[Dict], emphasis_indices: List[int]) -> str:
    """Formata o texto de um clip com tags ASS de cor para ênfase."""
    parts = []
    reset_tag = "{\\1c" + PRIMARY_WHITE + "}"
    emphasis_tag = "{\\1c" + EMPHASIS_YELLOW + "}"

    for i, w in enumerate(clip_words):
        raw = w["word"]
        if i in emphasis_indices:
            parts.append(f"{emphasis_tag}{raw}{reset_tag}")
        else:
            parts.append(raw)

    text = " ".join(parts)
    # Quebra de linha se passar de ~22 caracteres, preferencialmente no meio.
    if len(text.replace("{", "").replace("}", "")) > 24 and len(clip_words) >= 3:
        mid = len(clip_words) // 2
        line1_words = clip_words[:mid]
        line2_words = clip_words[mid:]
        line1_emp = [i for i in emphasis_indices if i < mid]
        line2_emp = [i - mid for i in emphasis_indices if i >= mid]
        return _format_ass_line(line1_words, line1_emp) + "\\N" + _format_ass_line(line2_words, line2_emp)
    return text


def _build_ass_header(video_width: int = 1080, video_height: int = 1920) -> str:
    """Monta o cabeçalho ASS com o estilo Hormozi."""
    s = HORMOZI_STYLE
    header = (
        "[Script Info]\n"
        "Title: GilCFP Hormozi Subtitles\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {video_width}\n"
        f"PlayResY: {video_height}\n"
        "ScaledBorderAndShadow: yes\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Hormozi,{s['fontname']},{s['fontsize']},{s['primary_colour']},{s['secondary_colour']},{s['outline_colour']},{s['back_colour']},{s['bold']},{s['italic']},{s['underline']},{s['strike_out']},{s['scale_x']},{s['scale_y']},{s['spacing']},{s['angle']},{s['border_style']},{s['outline']},{s['shadow']},{s['alignment']},{s['margin_l']},{s['margin_r']},{s['margin_v']},{s['encoding']}\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    return header


def generate_ass_from_transcript(
    transcript: Dict,
    output_path: str,
    video_width: int = 1080,
    video_height: int = 1920,
    max_words: int = 4,
    max_duration: float = 3.5,
) -> str:
    """Gera arquivo .ass a partir do transcript word-level do Whisper.

    Retorna o caminho do arquivo gerado.
    """
    words = transcript.get("words", [])
    clips = group_words_into_clips(words, max_words=max_words, max_duration=max_duration)

    lines = [_build_ass_header(video_width, video_height)]
    for clip in clips:
        start = _ass_time(clip["start"])
        end = _ass_time(clip["end"])
        emphasis = _pick_emphasis_words(clip["words"])
        text = _format_ass_line(clip["words"], emphasis)
        lines.append(f"Dialogue: 0,{start},{end},Hormozi,,0,0,0,,{text}")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
        f.write("\n")

    return output_path
