param(
    [string]$text
)

# Activate venv
& ".\AI_service\AI_summarzier\venv\Scripts\Activate.ps1"

# Run Python script
python ".\AI_service\AI_summarzier\AI_summarizer.py" $text