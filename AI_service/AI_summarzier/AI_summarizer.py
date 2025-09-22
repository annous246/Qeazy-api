from huggingface_hub import InferenceClient
from langchain_community.llms.gpt4all import GPT4All
from langchain.prompts import ChatPromptTemplate
from langchain_huggingface import HuggingFaceEndpoint,HuggingFacePipeline
#llm = GPT4All(model="./models/gpt4all-model.bin", n_threads=8)
import pypdf
import os
from langchain_community.document_loaders import PyPDFLoader
from transformers import pipeline

inference_model="Qwen/Qwen3-Next-80B-A3B-Instruct"
pipeline_model="Qwen/Qwen3-Next-80B-A3B-Instruct"
def inference(f):
    
        response = client.chat_completion(messages=[{"role":"system","content":"You are a professional text summarize keeping important content"},{"role": "user", "content": f"""SUMMERIZE THIS WITHOUT EXCEEDING 25000 CHARACTERS MAX  : ```{f}```"""}],
            model=inference_model,
            max_tokens=8500
            
        )
        print("input read")
        return  response.choices[0].message.content

def pipe(f):
        # model=pipeline('summarization',model="gpt2")
        # response = model('text suazdazdaz')
        # print("input read")
        # print("Generated content:", response)
        # Load model directly
    from transformers import AutoTokenizer, AutoModelForCausalLM

    tokenizer = AutoTokenizer.from_pretrained("pipeline_model")
    model = AutoModelForCausalLM.from_pretrained("pipeline_model")
    messages = [
        {"role": "user", "content": "Who are you?"},
    ]
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device)

    outputs = model.generate(**inputs, max_new_tokens=40)
    print(tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:]))
    
def summary(f):
    try:
        print("getting input in")  
        inference(f)    
    except Exception as e:
        print("Error:", e)



loader = PyPDFLoader("basic_thermo.pdf")
docs = loader.load()
full_text = "\n".join([doc.page_content for doc in docs])
print(len(full_text))
client = InferenceClient(token=os.environ.get("HUGGINGFACEHUB_API_TOKEN"))
result=summary(full_text)

