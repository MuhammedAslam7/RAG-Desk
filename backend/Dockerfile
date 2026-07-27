FROM python:3.12

WORKDIR /app

COPY . .

RUN pip install -e .

EXPOSE 8000

CMD ["python","-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]