$env:PYTHONPATH = (Resolve-Path "apps/api").Path
python -m unittest discover -s apps/api/tests -p "test_*.py" -v
exit $LASTEXITCODE
