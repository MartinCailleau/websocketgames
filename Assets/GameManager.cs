using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager instance;
    public List<GameObject> spawnedObjects;

    public Canvas scoreCanvas;
    public GameObject playerScorePrefab;
    // Start is called before the first frame update
    void Start()
    {
        if (instance == null)
        {
            instance = this;
        }
        else
        {
            Destroy(this);
        }
        
        spawnedObjects = new List<GameObject>();
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
